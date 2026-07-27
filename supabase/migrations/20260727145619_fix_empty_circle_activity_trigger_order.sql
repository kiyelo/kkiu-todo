-- PostgreSQL fires triggers with the same timing/event in alphabetical order.
-- Log a final member's departure before the empty-circle trigger deletes the
-- circle, otherwise the activity insert references an already-deleted row.
drop trigger if exists circle_members_log_activity on public.circle_members;
drop trigger if exists circle_members_00_log_activity on public.circle_members;

create trigger circle_members_00_log_activity
after insert or update of left_at
on public.circle_members
for each row
execute function private.log_circle_member_activity();
