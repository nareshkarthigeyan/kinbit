-- Rerunnable migration:
-- Allow authenticated users to read public profile rows so feed can resolve usernames.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Authenticated users can read profiles'
  ) then
    create policy "Authenticated users can read profiles"
    on public.users
    for select
    to authenticated
    using (true);
  end if;
end
$$;
