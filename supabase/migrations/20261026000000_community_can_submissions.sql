-- Community can submissions.
-- Submissions remain separate from the public catalogue until an admin approves them.
create table if not exists public.can_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  barcode text not null check (barcode ~ '^[0-9]{8,14}$'),
  name text not null check (char_length(trim(name)) between 2 and 120),
  brand_id uuid not null references public.brands(id) on delete restrict,
  flavour text,
  release_year integer check (release_year is null or release_year between 1900 and extract(year from now())::integer + 2),
  category public.can_category not null default 'Energy Drink',
  description text check (description is null or char_length(description) <= 1000),
  image_url text not null,
  back_image_url text,
  barcode_image_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists can_submissions_one_pending_barcode
  on public.can_submissions (barcode) where status = 'pending';
create index if not exists can_submissions_status_created_at
  on public.can_submissions (status, created_at desc);

alter table public.can_submissions enable row level security;
revoke all on table public.can_submissions from anon, public;
grant select, insert, update on table public.can_submissions to authenticated;

create policy "Users can submit cans as pending"
  on public.can_submissions for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and position('/storage/v1/object/public/can-submissions/' || (select auth.uid())::text || '/' in image_url) > 0
    and (back_image_url is null or position('/storage/v1/object/public/can-submissions/' || (select auth.uid())::text || '/' in back_image_url) > 0)
    and (barcode_image_url is null or position('/storage/v1/object/public/can-submissions/' || (select auth.uid())::text || '/' in barcode_image_url) > 0)
  );

create policy "Users can read their own can submissions"
  on public.can_submissions for select to authenticated
  using (submitted_by = (select auth.uid()));

create policy "Admins can read all can submissions"
  on public.can_submissions for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update can submissions"
  on public.can_submissions for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('can-submissions', 'can-submissions', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Signed-in users can upload their own can submission photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'can-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Admins can inspect can submission photo objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'can-submissions'
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Users can delete their own can submission photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'can-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Atomic promotion: only a trusted admin can copy a pending submission into the official catalogue.
create or replace function public.approve_can_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission public.can_submissions%rowtype;
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Only admins can approve can submissions';
  end if;

  select * into submission
  from public.can_submissions
  where id = p_submission_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending submission not found';
  end if;

  if exists (select 1 from public.cans where barcode = submission.barcode) then
    raise exception 'This barcode already exists in the official catalogue';
  end if;

  insert into public.cans (
    barcode, name, brand_id, release_year, flavour, description, image_url, category
  ) values (
    submission.barcode, submission.name, submission.brand_id, submission.release_year,
    submission.flavour, submission.description, submission.image_url, submission.category
  );

  update public.can_submissions
  set status = 'approved', reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = submission.id;
end;
$$;

revoke all on function public.approve_can_submission(uuid) from public, anon;
grant execute on function public.approve_can_submission(uuid) to authenticated;
