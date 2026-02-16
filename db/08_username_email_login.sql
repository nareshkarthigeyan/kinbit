-- Adds email support to public.users and exposes a safe username->email resolver
-- for auth sign-in. Rerunnable.

alter table public.users
add column if not exists email text;

-- Backfill profile emails from auth.users when possible.
update public.users u
set email = lower(au.email)
from auth.users au
where u.id = au.id
  and (u.email is null or u.email = '')
  and au.email is not null;

create index if not exists users_username_lower_idx
on public.users (lower(username));

create index if not exists users_email_lower_idx
on public.users (lower(email));

create or replace function public.resolve_login_email(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_input text;
  v_email text;
begin
  v_input := lower(trim(p_identifier));

  if v_input is null or v_input = '' then
    return null;
  end if;

  -- If it's already an email, return normalized value.
  if position('@' in v_input) > 0 then
    return v_input;
  end if;

  -- Preferred source: public.users profile.
  select lower(u.email)
  into v_email
  from public.users u
  where lower(u.username) = v_input
    and u.email is not null
    and u.email <> ''
  limit 1;

  if v_email is not null then
    return v_email;
  end if;

  -- Fallback source: auth.users metadata + auth email.
  select lower(au.email)
  into v_email
  from auth.users au
  where lower(coalesce(au.raw_user_meta_data->>'username', '')) = v_input
    and au.email is not null
  limit 1;

  return v_email;
end;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;
