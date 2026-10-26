-- Repair the community-submission RLS policies without disabling RLS or touching catalogue data.
-- Safe to re-run: only the two narrowly-scoped policies are replaced.

alter table public.can_submissions enable row level security;

revoke all on table public.can_submissions from anon, public;
grant select, insert, update on table public.can_submissions to authenticated;

drop policy if exists "Users can submit cans as pending" on public.can_submissions;
create policy "Users can submit cans as pending"
  on public.can_submissions
  for insert
  to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and position(
      '/storage/v1/object/public/can-submissions/' || (select auth.uid())::text || '/'
      in image_url
    ) > 0
    and (
      back_image_url is null
      or position(
        '/storage/v1/object/public/can-submissions/' || (select auth.uid())::text || '/'
        in back_image_url
      ) > 0
    )
    and (
      barcode_image_url is null
      or position(
        '/storage/v1/object/public/can-submissions/' || (select auth.uid())::text || '/'
        in barcode_image_url
      ) > 0
    )
  );

drop policy if exists "Signed-in users can upload their own can submission photos" on storage.objects;
create policy "Signed-in users can upload their own can submission photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'can-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
