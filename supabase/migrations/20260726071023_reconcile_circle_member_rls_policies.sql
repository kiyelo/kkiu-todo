do $migration$
declare
  current_insert_check text;
  current_select_qual text;
begin
  drop policy if exists circles_delete_member on public.circles;

  select with_check
    into current_insert_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'circle_members'
    and policyname = 'circle_members_insert_member';

  if current_insert_check is null
     or current_insert_check not ilike '%user_id%auth.uid%'
     or current_insert_check not ilike '%created_by%auth.uid%' then
    drop policy if exists circle_members_insert_member on public.circle_members;

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
  end if;

  select qual
    into current_select_qual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'circles'
    and policyname = 'circles_select_member';

  if current_select_qual is null
     or current_select_qual <> 'private.is_circle_member(id)'
     or current_select_qual ilike '%created_by%' then
    drop policy if exists circles_select_member on public.circles;

    create policy circles_select_member
    on public.circles
    for select
    to authenticated
    using (private.is_circle_member(id));
  end if;
end;
$migration$;
