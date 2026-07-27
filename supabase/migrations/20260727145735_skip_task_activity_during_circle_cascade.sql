create or replace function private.log_circle_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  target_circle_id uuid;
begin
  if tg_op = 'DELETE' then
    -- A direct task deletion should be recorded. During ON DELETE CASCADE from
    -- circles the parent row no longer exists, so no durable activity row can
    -- reference it and attempting the insert would abort the circle deletion.
    if old.circle_id is not null
       and exists (
         select 1
         from public.circles
         where id = old.circle_id
       ) then
      insert into public.circle_activity_logs (
        circle_id,
        actor_id,
        action,
        payload
      )
      values (
        old.circle_id,
        caller_id,
        'task_deleted',
        jsonb_build_object(
          'task_id', old.id,
          'title', old.title,
          'owner_id', old.owner_id,
          'assignee_id', old.assignee_id,
          'completed_at', old.completed_at
        )
      );
    end if;

    return old;
  end if;

  target_circle_id := coalesce(new.circle_id, old.circle_id);

  if target_circle_id is null then
    return new;
  end if;

  if old.owner_id is distinct from new.owner_id
     or old.assignee_id is distinct from new.assignee_id then
    insert into public.circle_activity_logs (
      circle_id,
      actor_id,
      action,
      payload
    )
    values (
      target_circle_id,
      caller_id,
      'task_reassigned',
      jsonb_build_object(
        'task_id', new.id,
        'title', new.title,
        'old_owner_id', old.owner_id,
        'new_owner_id', new.owner_id,
        'old_assignee_id', old.assignee_id,
        'new_assignee_id', new.assignee_id
      )
    );
  end if;

  if old.title is distinct from new.title
     or old.position is distinct from new.position then
    insert into public.circle_activity_logs (
      circle_id,
      actor_id,
      action,
      payload
    )
    values (
      target_circle_id,
      caller_id,
      'task_edited',
      jsonb_build_object(
        'task_id', new.id,
        'old_title', old.title,
        'new_title', new.title,
        'old_position', old.position,
        'new_position', new.position
      )
    );
  end if;

  if old.completed_at is null
     and new.completed_at is not null then
    insert into public.circle_activity_logs (
      circle_id,
      actor_id,
      action,
      payload
    )
    values (
      target_circle_id,
      caller_id,
      'task_completed',
      jsonb_build_object(
        'task_id', new.id,
        'title', new.title,
        'owner_id', new.owner_id,
        'assignee_id', new.assignee_id,
        'completed_at', new.completed_at
      )
    );
  end if;

  return new;
end;
$function$;
