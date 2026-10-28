-- Keep the can catalogue aligned with the actual product/variant model.
-- A can is the concrete collectible design; can_models groups related designs.
-- This migration is additive and preserves the existing public.cans shape.

alter table public.cans
  add column if not exists back_image_url text,
  add column if not exists barcode_image_url text;

-- Make sure all fields used by the new-can form exist even in projects
-- whose earlier schema was created manually rather than through migrations.
alter table public.can_submissions
  add column if not exists model_id uuid references public.can_models(id) on delete set null,
  add column if not exists variant_name text,
  add column if not exists region text,
  add column if not exists edition_type text default 'standard',
  add column if not exists volume_ml integer;

-- Enforce the same relationship at database level, not only in the admin UI.
create or replace function public.validate_can_model_brand()
returns trigger
language plpgsql
set search_path = ''
as $
begin
  if new.model_id is not null and not exists (
    select 1
      from public.can_models model
     where model.id = new.model_id
       and model.brand_id = new.brand_id
  ) then
    raise exception 'The selected model must belong to the same brand as the can';
  end if;
  return new;
end;
$;

drop trigger if exists validate_can_model_brand_on_cans on public.cans;
create trigger validate_can_model_brand_on_cans
before insert or update of model_id, brand_id on public.cans
for each row execute function public.validate_can_model_brand();

drop trigger if exists validate_can_model_brand_on_submissions on public.can_submissions;
create trigger validate_can_model_brand_on_submissions
before insert or update of model_id, brand_id on public.can_submissions
for each row execute function public.validate_can_model_brand();

-- Separate collection ownership from the optional "Drinks" statistic.
-- Legacy condition rows remain readable; ownership is now simply whether any row exists.
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


-- Let a can submission propose a brand that is not in the catalogue yet.
alter table public.can_submissions
  alter column brand_id drop not null,
  add column if not exists proposed_brand_name text;

alter table public.can_submissions
  drop constraint if exists can_submissions_brand_or_proposed_brand;
alter table public.can_submissions
  add constraint can_submissions_brand_or_proposed_brand
  check (
    brand_id is not null
    or (proposed_brand_name is not null and char_length(trim(proposed_brand_name)) between 2 and 100)
  );

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
    if submission.proposed_brand_name is null or char_length(trim(submission.proposed_brand_name)) < 2 then
      raise exception 'A brand must be selected or proposed before publication';
    end if;

    select id into resolved_brand_id
      from public.brands
     where lower(trim(name)) = lower(trim(submission.proposed_brand_name))
     limit 1;

    if resolved_brand_id is null then
      normalized_slug := trim(both '-' from regexp_replace(lower(trim(submission.proposed_brand_name)), '[^a-z0-9]+', '-', 'g'));
      if normalized_slug = '' then
        normalized_slug := 'brand';
      end if;
      normalized_slug := left(normalized_slug, 70) || '-' || left(submission.id::text, 6);

      insert into public.brands (name, slug)
      values (trim(submission.proposed_brand_name), normalized_slug)
      returning id into resolved_brand_id;
    end if;
  end if;

  if submission.model_id is not null and not exists (
    select 1 from public.can_models model
    where model.id = submission.model_id and model.brand_id = resolved_brand_id
  ) then
    raise exception 'The selected model does not belong to the selected brand';
  end if;

  insert into public.cans (
    barcode, name, brand_id, release_year, flavour, description,
    image_url, back_image_url, barcode_image_url, category, model_id,
    variant_name, region, edition_type, volume_ml
  ) values (
    submission.barcode, submission.name, resolved_brand_id, submission.release_year,
    submission.flavour, submission.description, submission.image_url,
    submission.back_image_url, submission.barcode_image_url, submission.category,
    submission.model_id,
    coalesce(nullif(trim(submission.variant_name), ''), 'Standard'),
    nullif(trim(submission.region), ''),
    coalesce(nullif(trim(submission.edition_type), ''), 'standard'),
    submission.volume_ml
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

notify pgrst, 'reload schema';
