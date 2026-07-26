begin;

create table public.app_users (
  id uuid primary key,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.app_users is
  'auth.users 삭제 후에도 그룹 멤버십, 할 일 작성자·담당자, 완료 로그의 사용자 UUID를 보존하는 테이블';

comment on column public.app_users.deleted_at is
  '계정 탈퇴 시각. NULL이면 auth 계정이 존재하는 활성 사용자일 수 있다.';

insert into public.app_users (id, created_at)
select
  users_row.id,
  coalesce(users_row.created_at, now())
from auth.users users_row
on conflict (id) do nothing;

create or replace function private.shares_circle_history(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select auth.uid() is not null
    and (
      target_user_id = auth.uid()
      or exists (
        select 1
        from public.circle_members mine
        join public.circle_members theirs
          on theirs.circle_id = mine.circle_id
        where mine.user_id = auth.uid()
          and theirs.user_id = target_user_id
      )
    );
$function$;

revoke all on function private.shares_circle_history(uuid) from public;
revoke all on function private.shares_circle_history(uuid) from anon;
grant execute on function private.shares_circle_history(uuid) to authenticated;

alter table public.app_users enable row level security;

create policy app_users_select_self_or_shared_history
on public.app_users
for select
to authenticated
using (
  id = (select auth.uid())
  or private.shares_circle_history(id)
);

revoke all on table public.app_users from public;
revoke all on table public.app_users from anon;
revoke all on table public.app_users from authenticated;
grant select on table public.app_users to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  insert into public.app_users (id, created_at)
  values (new.id, coalesce(new.created_at, now()))
  on conflict (id) do nothing;

  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), '나'))
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

do $do$
declare
  target_fk record;
begin
  for target_fk in
    select distinct
      source_namespace.nspname as schema_name,
      source_table.relname as table_name,
      source_column.attname as column_name,
      constraint_row.conname as constraint_name
    from pg_constraint constraint_row
    join pg_class source_table
      on source_table.oid = constraint_row.conrelid
    join pg_namespace source_namespace
      on source_namespace.oid = source_table.relnamespace
    join lateral unnest(constraint_row.conkey) as source_key(attnum)
      on true
    join pg_attribute source_column
      on source_column.attrelid = source_table.oid
     and source_column.attnum = source_key.attnum
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'auth.users'::regclass
      and source_namespace.nspname = 'public'
      and (
        (source_table.relname = 'circle_members' and source_column.attname = 'user_id')
        or (source_table.relname = 'circles' and source_column.attname = 'created_by')
        or (source_table.relname = 'tasks' and source_column.attname in ('owner_id', 'assignee_id'))
        or (source_table.relname = 'completion_events' and source_column.attname = 'user_id')
      )
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      target_fk.schema_name,
      target_fk.table_name,
      target_fk.constraint_name
    );
  end loop;
end;
$do$;

alter table public.circle_members
  add constraint circle_members_user_id_app_users_fkey
  foreign key (user_id)
  references public.app_users(id);

alter table public.circles
  add constraint circles_created_by_app_users_fkey
  foreign key (created_by)
  references public.app_users(id);

alter table public.tasks
  add constraint tasks_owner_id_app_users_fkey
  foreign key (owner_id)
  references public.app_users(id);

alter table public.tasks
  add constraint tasks_assignee_id_app_users_fkey
  foreign key (assignee_id)
  references public.app_users(id);

alter table public.completion_events
  add constraint completion_events_user_id_app_users_fkey
  foreign key (user_id)
  references public.app_users(id);

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  target_user_id uuid := (select auth.uid());
  affected_circle_ids uuid[] := array[]::uuid[];
  soft_deleted_memberships integer := 0;
  deleted_personal_tasks integer := 0;
  deleted_circles integer := 0;
  preserved_group_tasks integer := 0;
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

  select coalesce(array_agg(cm.circle_id), array[]::uuid[])
    into affected_circle_ids
  from public.circle_members cm
  where cm.user_id = target_user_id
    and cm.left_at is null;

  update public.circle_members
  set
    left_at = coalesce(left_at, now()),
    nickname = null
  where user_id = target_user_id;

  get diagnostics soft_deleted_memberships = row_count;

  if cardinality(affected_circle_ids) > 0 then
    select count(*)
      into deleted_circles
    from unnest(affected_circle_ids) as affected_circle(circle_id)
    where not exists (
      select 1
      from public.circles c
      where c.id = affected_circle.circle_id
    );
  end if;

  update public.app_users
  set deleted_at = coalesce(deleted_at, now())
  where id = target_user_id;

  select count(*)
    into preserved_group_tasks
  from public.tasks
  where circle_id is not null
    and (
      owner_id = target_user_id
      or assignee_id = target_user_id
    );

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
    'soft_deleted_memberships', soft_deleted_memberships,
    'deleted_circles', deleted_circles,
    'deleted_personal_tasks', deleted_personal_tasks,
    'preserved_group_tasks', preserved_group_tasks
  );
end;
$function$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

commit;
