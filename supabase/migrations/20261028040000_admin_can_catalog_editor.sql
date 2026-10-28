-- Restrict direct edits to the cans catalogue to users with the admin JWT role.
-- Existing public SELECT policies are left unchanged.
alter table public.cans enable row level security;

drop policy if exists "Admins can update cans" on public.cans;
create policy "Admins can update cans"
on public.cans for update
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
