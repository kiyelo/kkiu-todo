create or replace function public.join_circle_by_code(
  join_code text,
  member_name text default '나'::text,
  member_emoji text default '🙂'::text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  normalized_code text := upper(trim(join_code));
  safe_name text := left(coalesce(nullif(trim(member_name), ''), '나'), 40);
  safe_emoji text := left(coalesce(nullif(trim(member_emoji), ''), '🙂'), 16);
  target_circle_id uuid;
begin
  if caller_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if normalized_code is null
     or char_length(normalized_code) < 6
     or char_length(normalized_code) > 64 then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  select id into target_circle_id
  from public.circles
  where upper(invite_code) = normalized_code
  limit 1;

  if target_circle_id is null then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  insert into public.circle_members (
    circle_id, user_id, role, nickname, emoji, position, left_at
  )
  values (
    target_circle_id,
    caller_id,
    'member',
    safe_name,
    safe_emoji,
    coalesce((
      select max(position) + 1
      from public.circle_members
      where circle_id = target_circle_id
    ), 0),
    null
  )
  on conflict (circle_id, user_id)
  do update set left_at = null;

  return target_circle_id;
end;
$$;

drop trigger if exists circle_members_protect_owner on public.circle_members;
drop function if exists public.protect_last_circle_owner();

drop policy if exists circle_members_delete_owner_or_self on public.circle_members;
drop policy if exists circle_members_insert_owner on public.circle_members;
drop policy if exists circle_members_update_owner on public.circle_members;
drop policy if exists circles_delete_owner on public.circles;
drop policy if exists circles_update_owner on public.circles;
drop policy if exists circles_delete_member on public.circles;

create policy circle_members_insert_member
on public.circle_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    private.is_circle_member(circle_id)
    or exists (
      select 1
      from public.circles
      where circles.id = circle_members.circle_id
        and circles.created_by = (select auth.uid())
    )
  )
);

create policy circle_members_update_member
on public.circle_members
for update
to authenticated
using (
  left_at is null
  and private.is_circle_member(circle_id)
)
with check (
  left_at is null
  and private.is_circle_member(circle_id)
);

create policy circle_members_leave_self
on public.circle_members
for update
to authenticated
using (
  user_id = (select auth.uid())
  and left_at is null
)
with check (
  user_id = (select auth.uid())
  and left_at is not null
);

create policy circles_update_member
on public.circles
for update
to authenticated
using (private.is_circle_member(id))
with check (private.is_circle_member(id));

create or replace function private.delete_circle_when_empty()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.circles
  where id = new.circle_id
    and not exists (
      select 1
      from public.circle_members
      where circle_id = new.circle_id
        and left_at is null
    );

  return new;
end;
$$;

revoke all on function private.delete_circle_when_empty() from public;

drop trigger if exists circle_members_delete_empty_circle on public.circle_members;

create trigger circle_members_delete_empty_circle
after update of left_at
on public.circle_members
for each row
when (old.left_at is null and new.left_at is not null)
execute function private.delete_circle_when_empty();

drop function if exists private.is_circle_owner();
drop function if exists private.is_circle_owner(uuid);
