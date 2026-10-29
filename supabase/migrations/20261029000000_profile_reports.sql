-- Public profile reports: private, authenticated submissions only.
create table if not exists public.profile_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  comment text not null check (char_length(trim(comment)) between 3 and 2000),
  photo_paths text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint profile_reports_no_self_report check (reporter_id <> reported_user_id),
  constraint profile_reports_max_two_photos check (cardinality(photo_paths) <= 2)
);

alter table public.profile_reports enable row level security;
drop policy if exists "Users can submit profile reports" on public.profile_reports;
create policy "Users can submit profile reports"
  on public.profile_reports for insert to authenticated
  with check (reporter_id = auth.uid() and reporter_id <> reported_user_id);
drop policy if exists "Users can read their own profile reports" on public.profile_reports;
create policy "Users can read their own profile reports"
  on public.profile_reports for select to authenticated
  using (reporter_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-reports', 'profile-reports', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "Users can upload profile report photos" on storage.objects;
create policy "Users can upload profile report photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-reports' and (storage.foldername(name))[1] = auth.uid()::text);
