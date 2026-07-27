alter table public.circles
  add column if not exists join_locked boolean not null default false;

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
  normalized_code text := upper(trim(join_code));
  safe_name text := left(coalesce(nullif(trim(member_name), ''), '나'), 40);
  safe_emoji text := left(coalesce(nullif(trim(member_emoji), ''), '🙂'), 16);
  target_circle_id uuid;
  target_join_locked boolean;
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
$function$;

create or replace function public.regenerate_invite_code(target_circle_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  generated_invite_code text;
  attempt_count integer;
begin
  if caller_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if not private.is_circle_member(target_circle_id) then
    raise exception 'NOT_CIRCLE_MEMBER';
  end if;

  for attempt_count in 1..5 loop
    generated_invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      update public.circles
      set invite_code = generated_invite_code
      where id = target_circle_id;
      return generated_invite_code;
    exception when unique_violation then
      generated_invite_code := null;
    end;
  end loop;

  raise exception 'INVITE_CODE_GENERATION_FAILED';
end;
$function$;

create or replace function public.set_circle_join_lock(
  target_circle_id uuid,
  locked boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if not private.is_circle_member(target_circle_id) then
    raise exception 'NOT_CIRCLE_MEMBER';
  end if;

  update public.circles
  set join_locked = locked
  where id = target_circle_id;
end;
$function$;

revoke all on function public.join_circle_by_code(text, text, text) from public, anon;
grant execute on function public.join_circle_by_code(text, text, text) to authenticated;
revoke all on function public.regenerate_invite_code(uuid) from public, anon;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;
revoke all on function public.set_circle_join_lock(uuid, boolean) from public, anon;
grant execute on function public.set_circle_join_lock(uuid, boolean) to authenticated;
