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


-- Recreate the publication function here too, so environments that missed the
-- original migration can recover without relying on a stale PostgREST schema cache.
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

-- Apply a contribution and update its moderation status in one transaction.
create or replace function public.review_can_report(
  p_report_id uuid,
  p_approve boolean,
  p_field text default null,
  p_value text default null,
  p_review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  report public.can_reports%rowtype;
  final_value text;
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Only admins can review can reports';
  end if;

  select * into report
  from public.can_reports
  where id = p_report_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending contribution not found';
  end if;

  if p_approve then
    if p_field not in (
      'name', 'brand_id', 'barcode', 'flavour', 'release_year', 'category',
      'description', 'historical_context', 'image_url', 'color_primary',
      'color_secondary', 'caffeine_mg_per_100ml', 'sugar_g_per_100ml',
      'taurine_mg_per_100ml', 'energy_kcal_per_100ml', 'volume_ml', 'history_verified'
    ) then
      raise exception 'Field is not allowed';
    end if;

    final_value := nullif(trim(p_value), '');
    if p_field = 'image_url' and final_value is null then
      final_value := report.image_urls[1];
    end if;
    if final_value is null then
      raise exception 'A value or an attached image is required';
    end if;

    if p_field = 'barcode' and exists (
      select 1 from public.cans where barcode = final_value and id <> report.can_id
    ) then
      raise exception 'This barcode already belongs to another can';
    end if;

    case p_field
      when 'name' then update public.cans set name = final_value where id = report.can_id;
      when 'brand_id' then update public.cans set brand_id = final_value::uuid where id = report.can_id;
      when 'barcode' then update public.cans set barcode = final_value where id = report.can_id;
      when 'flavour' then update public.cans set flavour = final_value where id = report.can_id;
      when 'release_year' then update public.cans set release_year = final_value::integer where id = report.can_id;
      when 'category' then update public.cans set category = final_value::public.can_category where id = report.can_id;
      when 'description' then update public.cans set description = final_value where id = report.can_id;
      when 'historical_context' then update public.cans set historical_context = final_value where id = report.can_id;
      when 'image_url' then update public.cans set image_url = final_value where id = report.can_id;
      when 'color_primary' then update public.cans set color_primary = final_value where id = report.can_id;
      when 'color_secondary' then update public.cans set color_secondary = final_value where id = report.can_id;
      when 'caffeine_mg_per_100ml' then update public.cans set caffeine_mg_per_100ml = final_value::numeric where id = report.can_id;
      when 'sugar_g_per_100ml' then update public.cans set sugar_g_per_100ml = final_value::numeric where id = report.can_id;
      when 'taurine_mg_per_100ml' then update public.cans set taurine_mg_per_100ml = final_value::numeric where id = report.can_id;
      when 'energy_kcal_per_100ml' then update public.cans set energy_kcal_per_100ml = final_value::numeric where id = report.can_id;
      when 'volume_ml' then update public.cans set volume_ml = final_value::integer where id = report.can_id;
      when 'history_verified' then update public.cans set history_verified = final_value::boolean where id = report.can_id;
    end case;
  end if;

  update public.can_reports
  set status = case when p_approve then 'approved' else 'rejected' end,
      review_notes = nullif(trim(p_review_notes), ''),
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = report.id;
end;
$$;

revoke all on function public.review_can_report(uuid, boolean, text, text, text) from public, anon;
grant execute on function public.review_can_report(uuid, boolean, text, text, text) to authenticated;

notify pgrst, 'reload schema';
