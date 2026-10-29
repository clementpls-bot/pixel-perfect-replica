-- Allow only admins to review reports and access their private attachments.
drop policy if exists "Admins can review profile reports" on public.profile_reports;
create policy "Admins can review profile reports"
  on public.profile_reports for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can read profile report photos" on storage.objects;
create policy "Admins can read profile report photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'profile-reports' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update profile report status" on public.profile_reports;
create policy "Admins can update profile report status"
  on public.profile_reports for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
