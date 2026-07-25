create table if not exists public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_type text not null check (terms_type in ('terms_of_service', 'privacy_policy', 'marketing')),
  terms_version text not null check (char_length(trim(terms_version)) between 1 and 100),
  accepted_at timestamptz not null default now(),
  source text not null default 'app' check (char_length(trim(source)) between 1 and 50),
  locale text check (locale is null or char_length(trim(locale)) between 2 and 20),
  metadata jsonb not null default '{}'::jsonb,
  constraint terms_acceptances_user_type_version_key unique (user_id, terms_type, terms_version),
  constraint terms_acceptances_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists terms_acceptances_user_accepted_at_idx
  on public.terms_acceptances (user_id, accepted_at desc);

alter table public.terms_acceptances enable row level security;

revoke all privileges on table public.terms_acceptances from public, anon, authenticated;
grant select, insert on table public.terms_acceptances to authenticated;

drop policy if exists "terms_acceptances_select_self" on public.terms_acceptances;
create policy "terms_acceptances_select_self"
on public.terms_acceptances
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "terms_acceptances_insert_self" on public.terms_acceptances;
create policy "terms_acceptances_insert_self"
on public.terms_acceptances
for insert
to authenticated
with check ((select auth.uid()) = user_id);

comment on table public.terms_acceptances is
  'Append-only consent log for versioned terms accepted by authenticated users.';
comment on column public.terms_acceptances.terms_type is
  'One of terms_of_service, privacy_policy, or marketing.';
comment on column public.terms_acceptances.terms_version is
  'Immutable application-defined version identifier for the accepted document.';
comment on column public.terms_acceptances.metadata is
  'Optional non-authoritative context such as app version or consent screen identifier.';
