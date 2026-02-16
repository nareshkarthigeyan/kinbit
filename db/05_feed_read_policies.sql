-- PHOTO-CIRCLE MAP read for members
create policy "Members can view mapped photos"
on public.photo_circle_map
for select
using (
  exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = photo_circle_map.circle_id
    and cm.user_id = auth.uid()
  )
);

-- PHOTOS read when user belongs to at least one mapped circle
create policy "Members can view photos in their circles"
on public.photos
for select
using (
  auth.uid() = sender_id
  or exists (
    select 1
    from public.photo_circle_map pcm
    join public.circle_members cm on cm.circle_id = pcm.circle_id
    where pcm.photo_id = photos.id
    and cm.user_id = auth.uid()
  )
);

-- STORAGE read from private photos bucket
create policy "Members can read photo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'photos'
);
