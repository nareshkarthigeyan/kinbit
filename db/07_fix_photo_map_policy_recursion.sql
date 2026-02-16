-- Fix recursion between photo_circle_map insert policy and photos select policy.

create or replace function public.user_owns_photo(p_photo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.photos p
    where p.id = p_photo_id
    and p.sender_id = auth.uid()
  );
$$;

grant execute on function public.user_owns_photo(uuid) to authenticated;

drop policy if exists "Users can map photos to their circles" on public.photo_circle_map;
create policy "Users can map photos to their circles"
on public.photo_circle_map
for insert
with check (
  public.user_owns_photo(photo_id)
  and exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = photo_circle_map.circle_id
    and cm.user_id = auth.uid()
  )
);
