-- Account reports are private to their author and administrators.
create table if not exists public.account_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  details text not null check (char_length(trim(details)) between 5 and 2000),
  image_urls text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  review_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint account_reports_not_self check (reporter_user_id <> reported_user_id),
  constraint account_reports_max_two_images check (cardinality(image_urls) <= 2)
);

alter table public.account_reports enable row level security;

drop policy if exists "Users can submit account reports" on public.account_reports;
create policy "Users can submit account reports"
  on public.account_reports for insert to authenticated
  with check (
    auth.uid() = reporter_user_id
    and reporter_user_id <> reported_user_id
    and char_length(trim(details)) between 5 and 2000
    and cardinality(image_urls) <= 2
  );

drop policy if exists "Admins can read account reports" on public.account_reports;
create policy "Admins can read account reports"
  on public.account_reports for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update account reports" on public.account_reports;
create policy "Admins can update account reports"
  on public.account_reports for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Public profile pages can show collection totals and wall contents to signed-in visitors.
drop policy if exists "Authenticated users can view public collections" on public.user_cans;
create policy "Authenticated users can view public collections"
  on public.user_cans for select to authenticated using (true);

drop policy if exists "Authenticated users can view public drink totals" on public.user_can_drinks;
create policy "Authenticated users can view public drink totals"
  on public.user_can_drinks for select to authenticated using (true);

drop policy if exists "Authenticated users can view public profile galleries" on public.profile_gallery;
create policy "Authenticated users can view public profile galleries"
  on public.profile_gallery for select to authenticated using (true);

-- Store report attachments in a private bucket; only their owner may upload and admins may read them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('account-report-images', 'account-report-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users can upload their account report images" on storage.objects;
create policy "Users can upload their account report images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'account-report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Admins can read account report images" on storage.objects;
create policy "Admins can read account report images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'account-report-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Remove the two brands when they have no catalogue entries attached.
-- Intentionally do not delete cans or users' collections as a side effect.
delete from public.brands b
where lower(trim(b.name)) in ('bang', 'ciao energy')
  and not exists (select 1 from public.cans c where c.brand_id = b.id)
  and not exists (select 1 from public.can_models m where m.brand_id = b.id);
