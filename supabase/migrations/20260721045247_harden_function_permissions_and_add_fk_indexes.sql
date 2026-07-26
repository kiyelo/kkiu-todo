revoke all on function public.clear_task_read_receipts() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.join_circle_by_code(text, text, text) from public, anon, authenticated;
grant execute on function public.join_circle_by_code(text, text, text) to authenticated;

create index if not exists circles_created_by_idx on public.circles(created_by);
create index if not exists completion_events_circle_id_idx on public.completion_events(circle_id);
create index if not exists completion_events_task_id_idx on public.completion_events(task_id);
create index if not exists completion_events_user_id_idx on public.completion_events(user_id);
create index if not exists task_read_receipts_user_id_idx on public.task_read_receipts(user_id);
