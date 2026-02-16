create table if not exists public.circle_invites (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  code_hash text unique,
  code text unique,
  expires_at timestamp not null,
  max_uses integer not null default 50,
  used_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp not null default now()
);

alter table public.circle_invites add column if not exists code text;
alter table public.circle_invites alter column code_hash drop not null;
create unique index if not exists circle_invites_code_unique on public.circle_invites(code) where code is not null;

update public.circle_invites
set code = upper(substr(md5(id::text), 1, 8))
where code is null;

alter table public.circle_invites enable row level security;

-- Keep circle_members inserts limited: users can only self-add to circles they created.
drop policy if exists "Users can join circles" on public.circle_members;
drop policy if exists "Users can join own circles" on public.circle_members;
create policy "Users can join own circles"
on public.circle_members
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.circles c
    where c.id = circle_members.circle_id
    and c.created_by = auth.uid()
  )
);

-- Invite visibility/management
drop policy if exists "Members can view invites" on public.circle_invites;
create policy "Members can view invites"
on public.circle_invites
for select
using (
  exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = circle_invites.circle_id
    and cm.user_id = auth.uid()
  )
);

drop policy if exists "Members can create invites" on public.circle_invites;
create policy "Members can create invites"
on public.circle_invites
for insert
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = circle_invites.circle_id
    and cm.user_id = auth.uid()
  )
);

create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_exists integer;
  i integer := 0;
begin
  loop
    i := i + 1;
    begin
      execute 'select upper(encode(gen_random_bytes(4), ''hex''))' into v_code;
    exception
      when undefined_function then
        v_code := upper(substr(md5(random()::text || clock_timestamp()::text || i::text), 1, 8));
    end;

    select 1 into v_exists from public.circle_invites where code = v_code limit 1;
    if v_exists is null then
      return v_code;
    end if;

    if i > 20 then
      raise exception 'Failed to generate unique invite code';
    end if;
    v_exists := null;
  end loop;
end;
$$;

drop function if exists public.get_or_create_circle_invite(uuid, integer, integer);
create function public.get_or_create_circle_invite(
  p_circle_id uuid,
  p_expires_hours integer default 72,
  p_max_users integer default 50
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_code text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = p_circle_id
    and cm.user_id = v_user_id
  ) then
    raise exception 'You are not a member of this circle';
  end if;

  select ci.code
  into v_code
  from public.circle_invites ci
  where ci.circle_id = p_circle_id
  and ci.is_active = true
  and ci.expires_at > now()
  and ci.used_count < ci.max_uses
  and ci.code is not null
  order by ci.created_at desc
  limit 1;

  if v_code is not null then
    return v_code;
  end if;

  v_code := public.generate_invite_code();

  insert into public.circle_invites (
    circle_id,
    created_by,
    code_hash,
    code,
    expires_at,
    max_uses
  )
  values (
    p_circle_id,
    v_user_id,
    md5(v_code),
    v_code,
    now() + make_interval(hours => p_expires_hours),
    greatest(1, p_max_users)
  );

  return v_code;
end;
$$;

create or replace function public.create_circle_invite(
  p_circle_id uuid,
  p_expires_hours integer default 72,
  p_max_uses integer default 50
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.get_or_create_circle_invite(p_circle_id, p_expires_hours, p_max_uses);
end;
$$;

create or replace function public.redeem_circle_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_code text;
  v_invite public.circle_invites%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'Invite code required';
  end if;

  v_code := upper(trim(p_code));

  select *
  into v_invite
  from public.circle_invites ci
  where ci.code = v_code
  and ci.is_active = true
  for update;

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'Invite expired';
  end if;

  if v_invite.used_count >= v_invite.max_uses then
    raise exception 'Invite usage limit reached';
  end if;

  insert into public.circle_members (circle_id, user_id)
  values (v_invite.circle_id, v_user_id)
  on conflict (circle_id, user_id) do nothing;

  update public.circle_invites
  set used_count = used_count + 1,
      is_active = case when used_count + 1 >= max_uses then false else is_active end
  where id = v_invite.id;

  return v_invite.circle_id;
end;
$$;

grant execute on function public.create_circle_invite(uuid, integer, integer) to authenticated;
grant execute on function public.get_or_create_circle_invite(uuid, integer, integer) to authenticated;
grant execute on function public.generate_invite_code() to authenticated;
grant execute on function public.redeem_circle_invite(text) to authenticated;
