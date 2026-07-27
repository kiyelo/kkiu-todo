create or replace function private.reject_new_email_auth_users()
returns trigger
language plpgsql
security definer
set search_path = auth, pg_temp
as $$
declare
  initial_provider text;
  normalized_email text;
begin
  initial_provider := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  normalized_email := lower(coalesce(new.email, ''));

  if initial_provider = 'email'
     and normalized_email not in ('qa-a@example.test', 'qa-b@example.test') then
    raise exception using
      errcode = 'P0001',
      message = 'EMAIL_SIGNUP_DISABLED',
      detail = 'Kkiu accepts new accounts through enabled social OAuth providers only, except fixed QA accounts.';
  end if;

  return new;
end;
$$;

revoke all on function private.reject_new_email_auth_users() from public;

comment on function private.reject_new_email_auth_users() is
  'Blocks new email Auth users except the two fixed QA accounts; social OAuth users remain allowed.';
