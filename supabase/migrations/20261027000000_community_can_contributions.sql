-- Extend existing community reports into moderated field-level contributions.
alter table public.can_reports
  add column if not exists proposed_field text,
  add column if not exists proposed_value text,
  add column if not exists image_urls text[] not null default '{}'::text[],
  add column if not exists status text not null default 'pending',
  add column if not exists review_notes text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists can_reports_status_created_at_idx
  on public.can_reports (status, created_at desc);

alter table public.can_reports enable row level security;

drop policy if exists "Admins can read all can reports" on public.can_reports;
create policy "Admins can read all can reports"
  on public.can_reports for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update can reports" on public.can_reports;
create policy "Admins can update can reports"
  on public.can_reports for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update official cans" on public.cans;
create policy "Admins can update official cans"
  on public.cans for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('can-submissions', 'can-submissions', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('can-reports', 'can-reports', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own report photos" on storage.objects;
create policy "Users can upload their own report photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'can-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can read their own report photos" on storage.objects;
create policy "Users can read their own report photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'can-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Reports created by existing versions remain pending and visible to administrators.
