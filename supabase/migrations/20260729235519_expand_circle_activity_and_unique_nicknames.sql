alter table public.tasks
  add column if not exists notification_at timestamptz;

create unique index if not exists circle_members_active_nickname_key
  on public.circle_members (circle_id, lower(btrim(nickname)))
  where left_at is null and nickname is not null;

alter table public.circle_activity_logs
  drop constraint if exists circle_activity_logs_action_check;

alter table public.circle_activity_logs
  add constraint circle_activity_logs_action_check
  check (action in (
    'circle_renamed',
    'circle_emoji_changed',
    'invite_code_regenerated',
    'join_lock_on',
    'join_lock_off',
    'member_joined',
    'member_left',
    'member_profile_updated',
    'task_created',
    'task_deleted',
    'task_completed',
    'task_reopened',
    'task_assignee_changed',
    'task_title_changed',
    'task_position_changed',
    'task_reassigned',
    'task_edited'
  ));

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
    values (
      new.id,
      caller_id,
      'circle_renamed',
      jsonb_build_object('old_name', old.name, 'new_name', new.name)
    );
  end if;

  if old.emoji is distinct from new.emoji then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      new.id,
      caller_id,
      'circle_emoji_changed',
      jsonb_build_object('old_emoji', old.emoji, 'new_emoji', new.emoji)
    );
  end if;

  if old.invite_code is distinct from new.invite_code then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      new.id,
      caller_id,
      'invite_code_regenerated',
      jsonb_build_object('old_invite_code', old.invite_code, 'new_invite_code', new.invite_code)
    );
  end if;

  if old.join_locked is distinct from new.join_locked then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      new.id,
      caller_id,
      case when new.join_locked then 'join_lock_on' else 'join_lock_off' end,
      jsonb_build_object('locked', new.join_locked)
    );
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
      values (
        new.circle_id,
        caller_id,
        'member_joined',
        jsonb_build_object('member_id', new.user_id, 'nickname', new.nickname, 'emoji', new.emoji)
      );
    end if;
    return new;
  end if;

  if old.left_at is not null and new.left_at is null then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      new.circle_id,
      caller_id,
      'member_joined',
      jsonb_build_object(
        'member_id', new.user_id,
        'nickname', new.nickname,
        'emoji', new.emoji,
        'rejoined', true
      )
    );
    return new;
  end if;

  if old.left_at is null and new.left_at is not null then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      new.circle_id,
      caller_id,
      'member_left',
      jsonb_build_object(
        'member_id', new.user_id,
        'nickname', coalesce(new.nickname, old.nickname),
        'emoji', coalesce(new.emoji, old.emoji),
        'left_at', new.left_at
      )
    );
    return new;
  end if;

  if new.left_at is null
     and (
       old.nickname is distinct from new.nickname
       or old.emoji is distinct from new.emoji
     ) then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      new.circle_id,
      caller_id,
      'member_profile_updated',
      jsonb_build_object(
        'member_id', new.user_id,
        'old_nickname', old.nickname,
        'new_nickname', new.nickname,
        'old_emoji', old.emoji,
        'new_emoji', new.emoji
      )
    );
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
  if tg_op = 'INSERT' then
    if new.circle_id is not null then
      insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
      values (
        new.circle_id,
        caller_id,
        'task_created',
        jsonb_build_object(
          'task_id', new.id,
          'title', new.title,
          'position', new.position,
          'owner_id', new.owner_id,
          'assignee_id', new.assignee_id
        )
      );
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.circle_id is not null
       and exists (select 1 from public.circles where id = old.circle_id) then
      insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
      values (
        old.circle_id,
        caller_id,
        'task_deleted',
        jsonb_build_object(
          'task_id', old.id,
          'title', old.title,
          'position', old.position,
          'owner_id', old.owner_id,
          'assignee_id', old.assignee_id,
          'completed_at', old.completed_at
        )
      );
    end if;
    return old;
  end if;

  target_circle_id := coalesce(new.circle_id, old.circle_id);
  if target_circle_id is null then
    return new;
  end if;

  if old.assignee_id is distinct from new.assignee_id then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      target_circle_id,
      caller_id,
      'task_assignee_changed',
      jsonb_build_object(
        'task_id', new.id,
        'title', new.title,
        'position', new.position,
        'old_assignee_id', old.assignee_id,
        'new_assignee_id', new.assignee_id
      )
    );
  end if;

  if old.title is distinct from new.title then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      target_circle_id,
      caller_id,
      'task_title_changed',
      jsonb_build_object(
        'task_id', new.id,
        'old_title', old.title,
        'new_title', new.title,
        'position', new.position,
        'assignee_id', new.assignee_id
      )
    );
  end if;

  if old.position is distinct from new.position
     and old.notification_at is distinct from new.notification_at
     and new.notification_at is not null then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      target_circle_id,
      caller_id,
      'task_position_changed',
      jsonb_build_object(
        'task_id', new.id,
        'title', new.title,
        'old_position', old.position,
        'new_position', new.position,
        'assignee_id', new.assignee_id
      )
    );
  end if;

  if old.completed_at is null and new.completed_at is not null then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      target_circle_id,
      caller_id,
      'task_completed',
      jsonb_build_object(
        'task_id', new.id,
        'title', new.title,
        'position', new.position,
        'owner_id', new.owner_id,
        'assignee_id', new.assignee_id,
        'completed_at', new.completed_at
      )
    );
  elsif old.completed_at is not null and new.completed_at is null then
    insert into public.circle_activity_logs (circle_id, actor_id, action, payload)
    values (
      target_circle_id,
      caller_id,
      'task_reopened',
      jsonb_build_object(
        'task_id', new.id,
        'title', new.title,
        'position', new.position,
        'owner_id', new.owner_id,
        'assignee_id', new.assignee_id
      )
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists circles_log_activity on public.circles;
create trigger circles_log_activity
after update of name, emoji, invite_code, join_locked on public.circles
for each row execute function private.log_circle_activity();

drop trigger if exists circle_members_log_activity on public.circle_members;
drop trigger if exists circle_members_00_log_activity on public.circle_members;
create trigger circle_members_00_log_activity
after insert or update of left_at, nickname, emoji on public.circle_members
for each row execute function private.log_circle_member_activity();

drop trigger if exists tasks_log_circle_activity on public.tasks;
create trigger tasks_log_circle_activity
after insert or delete or update on public.tasks
for each row execute function private.log_circle_task_activity();

create or replace function public.update_circle_identity(
  target_circle_id uuid,
  circle_name text,
  circle_emoji text,
  member_nickname text,
  member_emoji text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  safe_circle_name text := left(nullif(btrim(circle_name), ''), 80);
  safe_circle_emoji text := left(nullif(btrim(circle_emoji), ''), 16);
  safe_member_nickname text := left(nullif(btrim(member_nickname), ''), 40);
  safe_member_emoji text := left(nullif(btrim(member_emoji), ''), 16);
begin
  if caller_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if safe_circle_name is null
     or safe_circle_emoji is null
     or safe_member_nickname is null
     or safe_member_emoji is null then
    raise exception 'INVALID_IDENTITY';
  end if;

  update public.circle_members
  set nickname = safe_member_nickname,
      emoji = safe_member_emoji
  where circle_id = target_circle_id
    and user_id = caller_id
    and left_at is null;

  if not found then
    raise exception 'NOT_CIRCLE_MEMBER' using errcode = '42501';
  end if;

  update public.circles
  set name = safe_circle_name,
      emoji = safe_circle_emoji
  where id = target_circle_id;

  if not found then
    raise exception 'CIRCLE_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$function$;

create or replace function public.join_circle_by_code(
  join_code text,
  member_name text default '나',
  member_emoji text default '🙂'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  normalized_code text := upper(btrim(join_code));
  safe_name text := left(coalesce(nullif(btrim(member_name), ''), '나'), 40);
  safe_emoji text := left(coalesce(nullif(btrim(member_emoji), ''), '🙂'), 16);
  target_circle_id uuid;
  target_join_locked boolean;
  next_position bigint;
begin
  if caller_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if normalized_code is null
     or char_length(normalized_code) < 6
     or char_length(normalized_code) > 64 then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  select id, join_locked
    into target_circle_id, target_join_locked
  from public.circles
  where upper(invite_code) = normalized_code
  limit 1;

  if target_circle_id is null then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  if target_join_locked then
    raise exception 'CIRCLE_JOIN_LOCKED';
  end if;

  if exists (
    select 1
    from public.circle_members
    where circle_id = target_circle_id
      and user_id <> caller_id
      and left_at is null
      and lower(btrim(nickname)) = lower(safe_name)
  ) then
    raise exception 'NICKNAME_TAKEN'
      using errcode = '23505', constraint = 'circle_members_active_nickname_key';
  end if;

  select coalesce(max(position) + 1, 0)
    into next_position
  from public.circle_members
  where circle_id = target_circle_id;

  insert into public.circle_members (
    circle_id,
    user_id,
    role,
    nickname,
    emoji,
    position,
    left_at
  )
  values (
    target_circle_id,
    caller_id,
    'member',
    safe_name,
    safe_emoji,
    next_position,
    null
  )
  on conflict (circle_id, user_id)
  do update set
    nickname = excluded.nickname,
    emoji = excluded.emoji,
    position = excluded.position,
    left_at = null;

  return target_circle_id;
end;
$function$;

revoke all on function public.update_circle_identity(uuid, text, text, text, text) from public, anon;
grant execute on function public.update_circle_identity(uuid, text, text, text, text) to authenticated;
revoke all on function public.join_circle_by_code(text, text, text) from public, anon;
grant execute on function public.join_circle_by_code(text, text, text) to authenticated;

comment on column public.tasks.notification_at is
  'Explicit user-driven reorder marker. Batch position shifts leave this unchanged so they do not create activity events.';

comment on index public.circle_members_active_nickname_key is
  'Active member nicknames are unique within each Circle after trimming and case folding.';
