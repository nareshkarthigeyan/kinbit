create policy "Users manage own profile"
on public.users
for all
using (auth.uid() = id)
with check (auth.uid() = id);
