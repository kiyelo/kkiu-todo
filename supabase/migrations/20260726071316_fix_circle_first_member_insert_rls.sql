create or replace function private.is_circle_creator(target_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.circles
      where id = target_circle_id
        and created_by = auth.uid()
    );
$function$;

revoke all on function private.is_circle_creator(uuid) from public;
grant execute on function private.is_circle_creator(uuid) to authenticated;

drop policy if exists circle_members_insert_member on public.circle_members;

create policy circle_members_insert_member
on public.circle_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    private.is_circle_member(circle_id)
    or private.is_circle_creator(circle_id)
  )
);
