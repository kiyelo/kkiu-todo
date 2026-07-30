-- User-scoped Circle notification events and device registrations.
-- Delivery workers consume notification_outbox with the service role and must
-- re-check the current profile preference immediately before sending.

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios', 'web')),
  token text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, token)
);

create index if not exists push_devices_user_enabled_idx
  on public.push_devices (user_id, enabled);

alter table public.push_devices enable row level security;
revoke all on public.push_devices from public, anon;
grant select, insert, update, delete on public.push_devices to authenticated;

drop policy if exists push_devices_select_self on public.push_devices;
create policy push_devices_select_self
  on public.push_devices for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists push_devices_insert_self on public.push_devices;
create policy push_devices_insert_self
  on public.push_devices for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists push_devices_update_self on public.push_devices;
create policy push_devices_update_self
  on public.push_devices for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists push_devices_delete_self on public.push_devices;
create policy push_devices_delete_self
  on public.push_devices for delete to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists push_devices_set_updated_at on public.push_devices;
create trigger push_devices_set_updated_at
before update on public.push_devices
for each row execute function public.set_updated_at();

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  recipient_id uuid not null references public.app_users(id) on delete cascade,
  actor_id uuid references public.app_users(id) on delete set null,
  circle_id uuid not null references public.circles(id) on delete cascade,
  task_id uuid,
  kind text not null check (kind in (
    'task_created',
    'task_updated',
    'task_deleted',
    'task_completed',
    'task_assigned',
    'task_unassigned',
    'service_notice'
  )),
  title text,
  deep_link text not null,
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists notification_outbox_delivery_idx
  on public.notification_outbox (status, available_at, created_at)
  where status in ('pending', 'failed');
create index if not exists notification_outbox_recipient_idx
  on public.notification_outbox (recipient_id, created_at desc);

alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from public, anon, authenticated;

create or replace function private.notification_preference_enabled(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce(
    (
      select case lower(profile.preferences ->> 'notifications')
        when 'false' then false
        when 'true' then true
        else true
      end
      from public.profiles profile
      where profile.user_id = target_user_id
    ),
    true
  );
$function$;

create or replace function private.enqueue_scoped_task_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  task_id_value uuid := nullif(new.payload ->> 'task_id', '')::uuid;
  task_title text := coalesce(new.payload ->> 'new_title', new.payload ->> 'title');
  recipient_id uuid;
  notification_kind text;
  event_suffix text;
  target_link text;
begin
  if new.action not in (
    'task_created',
    'task_title_changed',
    'task_deleted',
    'task_completed',
    'task_assignee_changed'
  ) then
    return new;
  end if;

  target_link := case
    when new.action = 'task_deleted' or task_id_value is null
      then 'kkiu://circle/' || new.circle_id::text
    else 'kkiu://circle/' || new.circle_id::text || '?task=' || task_id_value::text
  end;

  if new.action = 'task_assignee_changed' then
    for recipient_id, notification_kind, event_suffix in
      select candidate.recipient_id, candidate.kind, candidate.suffix
      from (
        values
          (nullif(new.payload ->> 'old_assignee_id', '')::uuid, 'task_unassigned'::text, 'old'::text),
          (nullif(new.payload ->> 'new_assignee_id', '')::uuid, 'task_assigned'::text, 'new'::text)
      ) as candidate(recipient_id, kind, suffix)
      where candidate.recipient_id is not null
        and candidate.recipient_id is distinct from new.actor_id
        and private.notification_preference_enabled(candidate.recipient_id)
    loop
      insert into public.notification_outbox (
        event_key, recipient_id, actor_id, circle_id, task_id, kind, title, deep_link, payload
      )
      values (
        new.id::text || ':' || recipient_id::text || ':' || event_suffix,
        recipient_id, new.actor_id, new.circle_id, task_id_value,
        notification_kind, task_title, target_link,
        new.payload || jsonb_build_object('activity_id', new.id)
      )
      on conflict (event_key) do nothing;
    end loop;
    return new;
  end if;

  recipient_id := nullif(new.payload ->> 'assignee_id', '')::uuid;
  if recipient_id is null
     or recipient_id is not distinct from new.actor_id
     or not private.notification_preference_enabled(recipient_id) then
    return new;
  end if;

  notification_kind := case new.action
    when 'task_created' then 'task_created'
    when 'task_title_changed' then 'task_updated'
    when 'task_deleted' then 'task_deleted'
    when 'task_completed' then 'task_completed'
  end;

  insert into public.notification_outbox (
    event_key, recipient_id, actor_id, circle_id, task_id, kind, title, deep_link, payload
  )
  values (
    new.id::text || ':' || recipient_id::text || ':' || notification_kind,
    recipient_id, new.actor_id, new.circle_id, task_id_value,
    notification_kind, task_title, target_link,
    new.payload || jsonb_build_object('activity_id', new.id)
  )
  on conflict (event_key) do nothing;

  return new;
end;
$function$;

drop trigger if exists circle_activity_enqueue_scoped_notification
  on public.circle_activity_logs;
create trigger circle_activity_enqueue_scoped_notification
after insert on public.circle_activity_logs
for each row execute function private.enqueue_scoped_task_notification();

revoke all on function private.notification_preference_enabled(uuid)
  from public, anon, authenticated;
revoke all on function private.enqueue_scoped_task_notification()
  from public, anon, authenticated;

comment on table public.notification_outbox is
  'Deduplicated task/service notification events. Only a trusted delivery worker may read or mutate rows.';
comment on column public.notification_outbox.deep_link is
  'Open the related task in its Circle; deleted tasks link to the Circle only.';
