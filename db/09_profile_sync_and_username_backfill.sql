-- Rerunnable migration:
-- - backfills public.users username/email from auth.users
-- - inserts missing public.users rows for existing auth.users
-- - keeps public.users synced via trigger on auth.users

alter table public.users
add column if not exists email text;

-- Ensure rows exist for any auth user.
insert into public.users (id, username, email)
select
  au.id,
  coalesce(
    nullif(trim(au.raw_user_meta_data->>'username'), ''),
    nullif(split_part(lower(au.email), '@', 1), '')
  ) as username,
  lower(au.email) as email
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;

-- Backfill missing emails.
update public.users pu
set email = lower(au.email)
from auth.users au
where pu.id = au.id
  and (pu.email is null or pu.email = '')
  and au.email is not null;

-- Backfill missing usernames.
update public.users pu
set username = coalesce(
  nullif(trim(au.raw_user_meta_data->>'username'), ''),
  nullif(split_part(lower(coalesce(au.email, pu.email)), '@', 1), '')
)
from auth.users au
where pu.id = au.id
  and (pu.username is null or pu.username = '');

create or replace function public.sync_public_user_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.users (id, username, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      nullif(split_part(lower(new.email), '@', 1), '')
    ),
    lower(new.email)
  )
  on conflict (id) do update
  set
    email = excluded.email,
    username = coalesce(
      nullif(trim(excluded.username), ''),
      nullif(trim(public.users.username), ''),
      nullif(split_part(lower(excluded.email), '@', 1), '')
    );

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'sync_public_user_profile_from_auth_trigger'
  ) then
    create trigger sync_public_user_profile_from_auth_trigger
    after insert or update of email, raw_user_meta_data
    on auth.users
    for each row
    execute function public.sync_public_user_profile_from_auth();
  end if;
end
$$;
