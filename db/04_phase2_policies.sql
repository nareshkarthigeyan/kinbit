-- CIRCLES
drop policy if exists "Members can view circles" on public.circles;
create policy "Members can view circles"
on public.circles
for select
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.circle_members
    where circle_id = circles.id
    and user_id = auth.uid()
  )
);

drop policy if exists "Users can create circles" on public.circles;
create policy "Users can create circles"
on public.circles
for insert
with check (auth.uid() = created_by);

-- CIRCLE MEMBERS
drop policy if exists "Users can view memberships" on public.circle_members;
create policy "Users can view memberships"
on public.circle_members
for select
using (auth.uid() = user_id);

drop policy if exists "Users can join circles" on public.circle_members;
create policy "Users can join circles"
on public.circle_members
for insert
with check (auth.uid() = user_id);

-- PHOTOS
drop policy if exists "Users can insert photos" on public.photos;
create policy "Users can insert photos"
on public.photos
for insert
with check (auth.uid() = sender_id);

drop policy if exists "Users can view own photos" on public.photos;
create policy "Users can view own photos"
on public.photos
for select
using (auth.uid() = sender_id);

-- PHOTO-CIRCLE MAP
drop policy if exists "Users can map photos to their circles" on public.photo_circle_map;
create policy "Users can map photos to their circles"
on public.photo_circle_map
for insert
with check (
  exists (
    select 1
    from public.photos p
    where p.id = photo_id
    and p.sender_id = auth.uid()
  )
  and exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = photo_circle_map.circle_id
    and cm.user_id = auth.uid()
  )
);

-- STORAGE (required for upload)
drop policy if exists "Authenticated can upload photos" on storage.objects;
create policy "Authenticated can upload photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'photos');
