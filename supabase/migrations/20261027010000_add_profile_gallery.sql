-- Personal collection gallery on user profiles.
create table if not exists public.profile_gallery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profile_gallery enable row level security;

drop policy if exists "Users can view their own gallery photos" on public.profile_gallery;
create policy "Users can view their own gallery photos"
  on public.profile_gallery for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own gallery photos" on public.profile_gallery;
create policy "Users can add their own gallery photos"
  on public.profile_gallery for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own gallery photos" on public.profile_gallery;
create policy "Users can delete their own gallery photos"
  on public.profile_gallery for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-gallery', 'profile-gallery', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own gallery photos" on storage.objects;
create policy "Users can upload their own gallery photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-gallery'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own gallery photos" on storage.objects;
create policy "Users can delete their own gallery photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-gallery'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Profile gallery photos are publicly readable" on storage.objects;
create policy "Profile gallery photos are publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'profile-gallery');
