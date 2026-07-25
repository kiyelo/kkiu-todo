create schema if not exists private;

create or replace function private.reject_new_email_auth_users()
returns trigger
language plpgsql
security definer
set search_path = auth, pg_temp
as $$
declare
  initial_provider text;
begin
  initial_provider := coalesce(new.raw_app_meta_data ->> 'provider', 'email');

  if initial_provider = 'email' then
    raise exception using
      errcode = 'P0001',
      message = 'EMAIL_SIGNUP_DISABLED',
      detail = 'Kkiu accepts new accounts through enabled social OAuth providers only.';
  end if;

  return new;
end;
$$;

revoke all on function private.reject_new_email_auth_users() from public;

drop trigger if exists reject_new_email_auth_users on auth.users;
create trigger reject_new_email_auth_users
before insert on auth.users
for each row
execute function private.reject_new_email_auth_users();

comment on function private.reject_new_email_auth_users() is
  'Blocks new email/password or email-OTP Auth users while preserving existing users; social OAuth users remain allowed.';
