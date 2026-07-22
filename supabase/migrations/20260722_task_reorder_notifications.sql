alter table public.tasks
  add column if not exists notification_at timestamptz;

create or replace function public.clear_task_read_receipts()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.title is distinct from new.title
     or old.assignee_id is distinct from new.assignee_id
     or old.completed_at is distinct from new.completed_at
     or old.notification_at is distinct from new.notification_at then
    delete from public.task_read_receipts where task_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.clear_task_read_receipts() from public;
