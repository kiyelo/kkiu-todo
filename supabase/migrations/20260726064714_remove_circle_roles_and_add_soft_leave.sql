alter table public.circle_members add column if not exists left_at timestamptz;

create or replace function private.is_circle_member(target_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1 from public.circle_members
    where circle_id = target_circle_id
      and user_id = auth.uid()
      and left_at is null
  );
$$;

create or replace function private.shares_circle(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.circle_members mine
    join public.circle_members theirs on theirs.circle_id = mine.circle_id
    where mine.user_id = auth.uid()
      and mine.left_at is null
      and theirs.user_id = target_user_id
      and theirs.left_at is null
  );
$$;
