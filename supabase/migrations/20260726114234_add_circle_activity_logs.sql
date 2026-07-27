create table if not exists public.circle_activity_logs (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  actor_id uuid references public.app_users(id),
  action text not null check (action in (
    'circle_renamed', 'invite_code_regenerated', 'join_lock_on', 'join_lock_off',
    'member_joined', 'member_left', 'task_deleted', 'task_reassigned',
    'task_edited', 'task_completed'
  )),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  constraint circle_activity_logs_deleted_task_title_check
    check (
      action <> 'task_deleted'
      or (payload ? 'title' and jsonb_typeof(payload -> 'title') = 'string')
    )
);

create index if not exists circle_activity_logs_circle_created_at_idx
  on public.circle_activity_logs (circle_id, created_at desc, id desc);
create index if not exists circle_activity_logs_actor_id_idx
  on public.circle_activity_logs (actor_id);

alter table public.circle_activity_logs enable row level security;
revoke all on public.circle_activity_logs from public, anon, authenticated;
grant select on public.circle_activity_logs to authenticated;

drop policy if exists circle_activity_logs_select_current_member
  on public.circle_activity_logs;
create policy circle_activity_logs_select_current_member
  on public.circle_activity_logs
  for select
  to authenticated
  using (private.is_circle_member(circle_id));

create or replace function private.log_circle_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if old.name is distinct from new.name then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (new.id, caller_id, 'circle_renamed',
      jsonb_build_object('old_name', old.name, 'new_name', new.name));
  end if;
  if old.invite_code is distinct from new.invite_code then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (new.id, caller_id, 'invite_code_regenerated',
      jsonb_build_object('old_invite_code', old.invite_code, 'new_invite_code', new.invite_code));
  end if;
  if old.join_locked is distinct from new.join_locked then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (new.id, caller_id,
      case when new.join_locked then 'join_lock_on' else 'join_lock_off' end,
      jsonb_build_object('locked', new.join_locked));
  end if;
  return new;
end;
$function$;

create or replace function private.log_circle_member_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.left_at is null then
      insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
      values (new.circle_id, caller_id, 'member_joined',
        jsonb_build_object('member_id', new.user_id, 'nickname', new.nickname, 'emoji', new.emoji));
    end if;
    return new;
  end if;

  if old.left_at is not null and new.left_at is null then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (new.circle_id, caller_id, 'member_joined',
      jsonb_build_object('member_id', new.user_id, 'nickname', new.nickname, 'emoji', new.emoji, 'rejoined', true));
  end if;
  if old.left_at is null and new.left_at is not null then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (new.circle_id, caller_id, 'member_left',
      jsonb_build_object(
        'member_id', new.user_id,
        'nickname', coalesce(new.nickname, old.nickname),
        'emoji', coalesce(new.emoji, old.emoji),
        'left_at', new.left_at
      ));
  end if;
  return new;
end;
$function$;

create or replace function private.log_circle_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  target_circle_id uuid;
begin
  if tg_op = 'DELETE' then
    if old.circle_id is not null then
      insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
      values (old.circle_id, caller_id, 'task_deleted',
        jsonb_build_object(
          'task_id', old.id, 'title', old.title, 'owner_id', old.owner_id,
          'assignee_id', old.assignee_id, 'completed_at', old.completed_at
        ));
    end if;
    return old;
  end if;

  target_circle_id := coalesce(new.circle_id, old.circle_id);
  if target_circle_id is null then return new; end if;
  if old.owner_id is distinct from new.owner_id
     or old.assignee_id is distinct from new.assignee_id then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (target_circle_id, caller_id, 'task_reassigned',
      jsonb_build_object(
        'task_id', new.id, 'title', new.title,
        'old_owner_id', old.owner_id, 'new_owner_id', new.owner_id,
        'old_assignee_id', old.assignee_id, 'new_assignee_id', new.assignee_id
      ));
  end if;
  if old.title is distinct from new.title
     or old.position is distinct from new.position then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (target_circle_id, caller_id, 'task_edited',
      jsonb_build_object(
        'task_id', new.id, 'old_title', old.title, 'new_title', new.title,
        'old_position', old.position, 'new_position', new.position
      ));
  end if;
  if old.completed_at is null and new.completed_at is not null then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (target_circle_id, caller_id, 'task_completed',
      jsonb_build_object(
        'task_id', new.id, 'title', new.title, 'owner_id', new.owner_id,
        'assignee_id', new.assignee_id, 'completed_at', new.completed_at
      ));
  end if;
  return new;
end;
$function$;

drop trigger if exists circles_log_activity on public.circles;
create trigger circles_log_activity
after update of name, invite_code, join_locked on public.circles
for each row execute function private.log_circle_activity();

drop trigger if exists circle_members_log_activity on public.circle_members;
create trigger circle_members_log_activity
after insert or update of left_at on public.circle_members
for each row execute function private.log_circle_member_activity();

drop trigger if exists tasks_log_circle_activity on public.tasks;
create trigger tasks_log_circle_activity
after delete or update on public.tasks
for each row execute function private.log_circle_task_activity();

create or replace function private.cleanup_circle_activity_logs()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  deleted_count bigint;
begin
  delete from public.circle_activity_logs
  where created_at < now() - interval '90 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$function$;

revoke all on function private.cleanup_circle_activity_logs() from public, anon, authenticated;

do $block$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'cleanup-circle-activity-logs-daily';
    perform cron.schedule(
      'cleanup-circle-activity-logs-daily',
      '17 3 * * *',
      'select private.cleanup_circle_activity_logs();'
    );
  end if;
end;
$block$;
