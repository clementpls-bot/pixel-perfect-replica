-- Keep the can catalogue aligned with the actual product/variant model.
-- A can is the concrete collectible design; can_models groups related designs.
-- This migration is additive and preserves the existing public.cans shape.

alter table public.cans
  add column if not exists back_image_url text,
  add column if not exists barcode_image_url text;

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

  select *
    into submission
    from public.can_submissions
   where id = p_submission_id
     and status = 'pending'
   for update;

  if not found then
    raise exception 'Pending submission not found';
  end if;

  if exists (
    select 1
      from public.cans
     where barcode = submission.barcode
  ) then
    raise exception 'This barcode already exists in the official catalogue';
  end if;

  -- A model must belong to the same brand as the proposed can.
  if submission.model_id is not null and not exists (
    select 1
      from public.can_models model
     where model.id = submission.model_id
       and model.brand_id = submission.brand_id
  ) then
    raise exception 'The selected model does not belong to the submitted brand';
  end if;

  -- Publish the complete reviewed record, not just the original basic fields.
  -- Earlier versions silently discarded model/variant/region/edition/volume
  -- and the reverse/barcode photos at approval time.
  insert into public.cans (
    barcode,
    name,
    brand_id,
    release_year,
    flavour,
    description,
    image_url,
    back_image_url,
    barcode_image_url,
    category,
    model_id,
    variant_name,
    region,
    edition_type,
    volume_ml
  ) values (
    submission.barcode,
    submission.name,
    submission.brand_id,
    submission.release_year,
    submission.flavour,
    submission.description,
    submission.image_url,
    submission.back_image_url,
    submission.barcode_image_url,
    submission.category,
    submission.model_id,
    coalesce(nullif(trim(submission.variant_name), ''), 'Standard'),
    nullif(trim(submission.region), ''),
    coalesce(nullif(trim(submission.edition_type), ''), 'standard'),
    submission.volume_ml
  );

  update public.can_submissions
     set status = 'approved',
         reviewed_by = (select auth.uid()),
         reviewed_at = now()
   where id = submission.id;
end;
$$;

revoke all on function public.approve_can_submission(uuid) from public, anon;
grant execute on function public.approve_can_submission(uuid) to authenticated;

notify pgrst, 'reload schema';
