create or replace function public.protect_last_circle_owner()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.role <> 'owner' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if not exists (
      select 1 from public.circles where id = old.circle_id
    ) then
      return old;
    end if;

    if not exists (
      select 1
      from public.circle_members
      where circle_id = old.circle_id
        and user_id <> old.user_id
        and role = 'owner'
    ) then
      raise exception 'A Circle must keep at least one owner';
    end if;

    return old;
  end if;

  if new.role <> 'owner' and not exists (
    select 1
    from public.circle_members
    where circle_id = old.circle_id
      and user_id <> old.user_id
      and role = 'owner'
  ) then
    raise exception 'A Circle must keep at least one owner';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_last_circle_owner() from public;

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target_user_id uuid := (select auth.uid());
  circle_row record;
  successor_user_id uuid;
  deleted_personal_tasks integer := 0;
  transferred_group_tasks integer := 0;
  transferred_circles integer := 0;
  deleted_circles integer := 0;
  removed_memberships integer := 0;
  affected_rows integer := 0;
begin
  if target_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'AUTHENTICATION_REQUIRED';
  end if;

  perform 1
  from auth.users
  where id = target_user_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'USER_NOT_FOUND';
  end if;

  for circle_row in
    select c.id
    from public.circles c
    where c.created_by = target_user_id
       or exists (
         select 1
         from public.circle_members cm
         where cm.circle_id = c.id
           and cm.user_id = target_user_id
           and cm.role = 'owner'
       )
    order by c.created_at, c.id
    for update
  loop
    successor_user_id := null;

    select cm.user_id
    into successor_user_id
    from public.circle_members cm
    where cm.circle_id = circle_row.id
      and cm.user_id <> target_user_id
    order by
      case when cm.role = 'owner' then 0 else 1 end,
      cm.joined_at,
      cm.user_id
    limit 1
    for update;

    if successor_user_id is null then
      delete from public.circles
      where id = circle_row.id;

      deleted_circles := deleted_circles + 1;
    else
      update public.circle_members
      set role = 'owner'
      where circle_id = circle_row.id
        and user_id = successor_user_id
        and role <> 'owner';

      update public.circles
      set created_by = successor_user_id
      where id = circle_row.id;

      update public.tasks
      set owner_id = successor_user_id
      where circle_id = circle_row.id
        and owner_id = target_user_id;
      get diagnostics affected_rows = row_count;
      transferred_group_tasks := transferred_group_tasks + affected_rows;

      delete from public.circle_members
      where circle_id = circle_row.id
        and user_id = target_user_id;
      get diagnostics affected_rows = row_count;
      removed_memberships := removed_memberships + affected_rows;

      transferred_circles := transferred_circles + 1;
    end if;
  end loop;

  update public.tasks t
  set owner_id = c.created_by
  from public.circles c
  where t.circle_id = c.id
    and t.owner_id = target_user_id;
  get diagnostics affected_rows = row_count;
  transferred_group_tasks := transferred_group_tasks + affected_rows;

  delete from public.circle_members
  where user_id = target_user_id;
  get diagnostics affected_rows = row_count;
  removed_memberships := removed_memberships + affected_rows;

  delete from public.tasks
  where owner_id = target_user_id
    and circle_id is null;
  get diagnostics deleted_personal_tasks = row_count;

  delete from auth.users
  where id = target_user_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'USER_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'deleted_user_id', target_user_id,
    'deleted_personal_tasks', deleted_personal_tasks,
    'transferred_group_tasks', transferred_group_tasks,
    'transferred_circles', transferred_circles,
    'deleted_circles', deleted_circles,
    'removed_memberships', removed_memberships
  );
end;
$$;

revoke execute on function public.delete_my_account() from public;
revoke execute on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'Deletes the authenticated user and personal data in one transaction, transfers eligible circle ownership/shared tasks, and deletes circles that have no successor.';
