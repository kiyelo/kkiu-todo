create or replace function public.create_circle_with_member(
  circle_name text,
  circle_emoji text,
  member_nickname text,
  member_emoji text
)
returns table (
  id uuid,
  name text,
  emoji text,
  invite_code text,
  created_by uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  safe_circle_name text := trim(circle_name);
  safe_circle_emoji text := coalesce(nullif(trim(circle_emoji), ''), '🍀');
  safe_member_nickname text := left(
    coalesce(nullif(trim(member_nickname), ''), '나'),
    40
  );
  safe_member_emoji text := left(
    coalesce(nullif(trim(member_emoji), ''), '🙂'),
    16
  );
  generated_invite_code text;
  created_circle_id uuid;
  attempt_count integer;
begin
  if caller_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '28000';
  end if;

  if safe_circle_name is null
     or char_length(safe_circle_name) < 1
     or char_length(safe_circle_name) > 80 then
    raise exception 'INVALID_CIRCLE_NAME';
  end if;

  if char_length(safe_circle_emoji) < 1
     or char_length(safe_circle_emoji) > 16 then
    raise exception 'INVALID_CIRCLE_EMOJI';
  end if;

  for attempt_count in 1..5 loop
    generated_invite_code := upper(
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
    );

    begin
      insert into public.circles (
        name,
        emoji,
        invite_code,
        created_by
      )
      values (
        safe_circle_name,
        safe_circle_emoji,
        generated_invite_code,
        caller_id
      )
      returning circles.id
        into created_circle_id;

      exit;
    exception
      when unique_violation then
        created_circle_id := null;
    end;
  end loop;

  if created_circle_id is null then
    raise exception 'INVITE_CODE_GENERATION_FAILED';
  end if;

  insert into public.circle_members (
    circle_id,
    user_id,
    nickname,
    emoji,
    position
  )
  values (
    created_circle_id,
    caller_id,
    safe_member_nickname,
    safe_member_emoji,
    0
  );

  return query
  select
    c.id,
    c.name,
    c.emoji,
    c.invite_code,
    c.created_by
  from public.circles c
  where c.id = created_circle_id;
end;
$function$;

revoke all on function public.create_circle_with_member(
  text,
  text,
  text,
  text
) from public;

revoke all on function public.create_circle_with_member(
  text,
  text,
  text,
  text
) from anon;

revoke all on function public.create_circle_with_member(
  text,
  text,
  text,
  text
) from authenticated;

grant execute on function public.create_circle_with_member(
  text,
  text,
  text,
  text
) to authenticated;
