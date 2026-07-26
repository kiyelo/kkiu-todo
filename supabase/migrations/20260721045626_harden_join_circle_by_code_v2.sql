create or replace function public.join_circle_by_code(
  join_code text,
  member_name text default '나',
  member_emoji text default '🙂'
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

  if normalized_code is null or char_length(normalized_code) < 6 or char_length(normalized_code) > 64 then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  select id
    into target_circle_id
  from public.circles
  where upper(invite_code) = normalized_code
  limit 1;

  if target_circle_id is null then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  insert into public.circle_members (
    circle_id,
    user_id,
    role,
    nickname,
    emoji,
    position
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
    ), 0)
  )
  on conflict (circle_id, user_id)
  do update set
    nickname = excluded.nickname,
    emoji = excluded.emoji;

  return target_circle_id;
end;
$$;

revoke all on function public.join_circle_by_code(text, text, text) from public;
revoke all on function public.join_circle_by_code(text, text, text) from anon;
grant execute on function public.join_circle_by_code(text, text, text) to authenticated;
