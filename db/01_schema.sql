create extension if not exists "pgcrypto";

-- USERS
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamp default now()
);

-- CIRCLES
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.users(id) on delete cascade,
  created_at timestamp default now()
);

-- CIRCLE MEMBERS
create table public.circle_members (
  circle_id uuid references public.circles(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  primary key (circle_id, user_id)
);

-- PHOTOS
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.users(id) on delete cascade,
  storage_path text not null,
  created_at timestamp default now(),
  expires_at timestamp not null
);

-- PHOTO-CIRCLE MAP
create table public.photo_circle_map (
  photo_id uuid references public.photos(id) on delete cascade,
  circle_id uuid references public.circles(id) on delete cascade,
  primary key (photo_id, circle_id)
);
