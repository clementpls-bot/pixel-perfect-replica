-- Consolidated, idempotent schema support for the Cansdex features being brought onto main.
-- Safe additions only: existing catalogue rows are preserved.

begin;

-- Submission fields used by the expanded proposal form and admin editor.
alter table public.can_submissions
  add column if not exists proposed_brand_name text,
  add column if not exists model_id uuid references public.can_models(id) on delete set null,
  add column if not exists variant_name text,
  add column if not exists region text,
  add column if not exists edition_type text default 'standard',
  add column if not exists volume_ml integer,
  add column if not exists historical_context text,
  add column if not exists color_primary text,
  add column if not exists color_secondary text,
  add column if not exists caffeine_mg_per_100ml numeric,
  add column if not exists sugar_g_per_100ml numeric,
  add column if not exists taurine_mg_per_100ml numeric,
  add column if not exists energy_kcal_per_100ml numeric,
  add column if not exists history_verified boolean not null default false,
  add column if not exists tab_color text,
  add column if not exists notes text;

-- A proposal may refer to an existing brand or propose a new one.
alter table public.can_submissions alter column brand_id drop not null;
alter table public.can_submissions drop constraint if exists can_submissions_brand_or_proposed_brand;
alter table public.can_submissions
  add constraint can_submissions_brand_or_proposed_brand
  check (
    brand_id is not null
    or (proposed_brand_name is not null and char_length(trim(proposed_brand_name)) between 2 and 100)
  ) not valid;

-- Keep the official catalogue compatible with the expanded editor and approval function.
alter table public.cans
  add column if not exists back_image_url text,
  add column if not exists barcode_image_url text;
alter table public.cans alter column color_primary set default '#222222';
alter table public.cans alter column color_secondary set default '#ffffff';
alter table public.cans alter column variant_name set default 'Standard';
alter table public.cans alter column edition_type set default 'standard';
alter table public.cans alter column history_verified set default false;

-- Atomic promotion, including the creation/resolution of a newly proposed brand.
create or replace function public.approve_can_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission public.can_submissions%rowtype;
  resolved_brand_id uuid;
  normalized_slug text;
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Only admins can approve can submissions';
  end if;

  select *
    into submission
    from public.can_submissions
   where id = p_submission_id
     and status = 'pending'
   for update;

  if not found then
    raise exception 'Pending submission not found';
  end if;

  if exists (select 1 from public.cans where barcode = submission.barcode) then
    raise exception 'This barcode already exists in the official catalogue';
  end if;

  resolved_brand_id := submission.brand_id;
  if resolved_brand_id is null then
    if submission.proposed_brand_name is null
       or char_length(trim(submission.proposed_brand_name)) < 2 then
      raise exception 'A brand must be selected or proposed before publication';
    end if;

    select id
      into resolved_brand_id
      from public.brands
     where lower(trim(name)) = lower(trim(submission.proposed_brand_name))
     limit 1;

    if resolved_brand_id is null then
      normalized_slug := trim(both '-' from regexp_replace(
        lower(trim(submission.proposed_brand_name)), '[^a-z0-9]+', '-', 'g'
      ));
      if normalized_slug = '' then normalized_slug := 'brand'; end if;
      normalized_slug := left(normalized_slug, 70) || '-' || left(submission.id::text, 6);

      insert into public.brands (name, slug)
      values (trim(submission.proposed_brand_name), normalized_slug)
      returning id into resolved_brand_id;
    end if;
  end if;

  if submission.model_id is not null and not exists (
    select 1 from public.can_models model
     where model.id = submission.model_id
       and model.brand_id = resolved_brand_id
  ) then
    raise exception 'The selected model does not belong to the selected brand';
  end if;

  insert into public.cans (
    barcode, name, brand_id, release_year, flavour, description,
    historical_context, image_url, back_image_url, barcode_image_url,
    category, model_id, variant_name, region, edition_type, volume_ml,
    color_primary, color_secondary, caffeine_mg_per_100ml,
    sugar_g_per_100ml, taurine_mg_per_100ml, energy_kcal_per_100ml,
    history_verified, tab_color, notes
  ) values (
    submission.barcode, submission.name, resolved_brand_id,
    submission.release_year, submission.flavour, submission.description,
    submission.historical_context, submission.image_url, submission.back_image_url,
    submission.barcode_image_url, submission.category, submission.model_id,
    coalesce(nullif(trim(submission.variant_name), ''), 'Standard'),
    nullif(trim(submission.region), ''),
    coalesce(nullif(trim(submission.edition_type), ''), 'standard'),
    submission.volume_ml,
    coalesce(nullif(trim(submission.color_primary), ''), '#222222'),
    coalesce(nullif(trim(submission.color_secondary), ''), '#ffffff'),
    submission.caffeine_mg_per_100ml, submission.sugar_g_per_100ml,
    submission.taurine_mg_per_100ml, submission.energy_kcal_per_100ml,
    coalesce(submission.history_verified, false),
    submission.tab_color, submission.notes
  );

  update public.can_submissions
     set status = 'approved',
         brand_id = resolved_brand_id,
         proposed_brand_name = null,
         reviewed_by = (select auth.uid()),
         reviewed_at = now()
   where id = submission.id;
end;
$$;

revoke all on function public.approve_can_submission(uuid) from public, anon;
grant execute on function public.approve_can_submission(uuid) to authenticated;

-- Admin-only direct catalogue editing.
alter table public.cans enable row level security;
drop policy if exists "Admins can update cans" on public.cans;
create policy "Admins can update cans"
  on public.cans for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Allow members to remove only their own comments.
drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
  on public.comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- Extra barcodes remain attached to an existing can; the primary barcode is unchanged.
create table if not exists public.can_barcodes (
  id uuid primary key default gen_random_uuid(),
  can_id uuid not null references public.cans(id) on delete cascade,
  barcode text not null unique check (barcode ~ '^[0-9]{8,14}$'),
  submitted_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
-- Replace any earlier escaped-digit check with a portable ASCII-digit expression.
alter table public.can_barcodes drop constraint if exists can_barcodes_barcode_check;
alter table public.can_barcodes
  add constraint can_barcodes_barcode_check
  check (barcode ~ '^[0-9]{8,14}$') not valid;
alter table public.can_barcodes enable row level security;
revoke all on public.can_barcodes from anon, public;
grant select on public.can_barcodes to anon, authenticated;
grant insert, update on public.can_barcodes to authenticated;

drop policy if exists "Anyone can read can barcode entries" on public.can_barcodes;
create policy "Anyone can read can barcode entries"
  on public.can_barcodes for select to anon, authenticated
  using (status in ('pending', 'approved'));
drop policy if exists "Authenticated users can propose can barcodes" on public.can_barcodes;
create policy "Authenticated users can propose can barcodes"
  on public.can_barcodes for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and barcode ~ '^[0-9]{8,14}$'
  );
drop policy if exists "Admins can moderate can barcodes" on public.can_barcodes;
create policy "Admins can moderate can barcodes"
  on public.can_barcodes for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'can_barcodes'
     ) then
    alter publication supabase_realtime add table public.can_barcodes;
  end if;
end
$$;

-- Private profile reports with user-owned uploads and admin review.
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
revoke all on public.profile_reports from anon, public;
grant select, insert, update on public.profile_reports to authenticated;

drop policy if exists "Users can submit profile reports" on public.profile_reports;
create policy "Users can submit profile reports"
  on public.profile_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and reporter_id <> reported_user_id);
drop policy if exists "Users can read their own profile reports" on public.profile_reports;
create policy "Users can read their own profile reports"
  on public.profile_reports for select to authenticated
  using (reporter_id = (select auth.uid()));
drop policy if exists "Admins can review profile reports" on public.profile_reports;
create policy "Admins can review profile reports"
  on public.profile_reports for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "Admins can update profile report status" on public.profile_reports;
create policy "Admins can update profile report status"
  on public.profile_reports for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-reports', 'profile-reports', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload profile report photos" on storage.objects;
create policy "Users can upload profile report photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Admins can read profile report photos" on storage.objects;
create policy "Admins can read profile report photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'profile-reports' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Keep Drinks tied to current collection ownership.
create table if not exists public.user_can_drinks (
  user_id uuid not null references auth.users(id) on delete cascade,
  can_id uuid not null references public.cans(id) on delete cascade,
  drinks_count integer not null default 0 check (drinks_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, can_id)
);
alter table public.user_can_drinks enable row level security;
revoke all on public.user_can_drinks from anon, public;
grant select, insert, update, delete on public.user_can_drinks to authenticated;
drop policy if exists "Users manage their own can drinks" on public.user_can_drinks;
create policy "Users manage their own can drinks"
  on public.user_can_drinks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

delete from public.user_can_drinks as drinks
where not exists (
  select 1 from public.user_cans as owned
   where owned.user_id = drinks.user_id and owned.can_id = drinks.can_id
);

create or replace function public.enforce_user_can_drinks_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.user_cans as owned
     where owned.user_id = new.user_id and owned.can_id = new.can_id
  ) then
    raise exception 'You must own this can before recording Drinks.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_user_can_drinks_ownership on public.user_can_drinks;
create trigger enforce_user_can_drinks_ownership
before insert or update of user_id, can_id, drinks_count
on public.user_can_drinks
for each row execute function public.enforce_user_can_drinks_ownership();

create or replace function public.remove_drinks_when_can_is_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.user_cans as owned
     where owned.user_id = old.user_id and owned.can_id = old.can_id
  ) then
    delete from public.user_can_drinks as drinks
     where drinks.user_id = old.user_id and drinks.can_id = old.can_id;
  end if;
  return old;
end;
$$;

drop trigger if exists remove_drinks_when_can_is_removed on public.user_cans;
create trigger remove_drinks_when_can_is_removed
after delete on public.user_cans
for each row execute function public.remove_drinks_when_can_is_removed();

notify pgrst, 'reload schema';

commit;
