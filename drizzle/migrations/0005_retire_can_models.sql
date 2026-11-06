CREATE OR REPLACE FUNCTION public.approve_can_submission(p_submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  submission public.can_submissions%rowtype;
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Only admins can approve can submissions';
  end if;
  select * into submission from public.can_submissions
  where id = p_submission_id and status = 'pending' for update;
  if not found then raise exception 'Pending submission not found'; end if;
  if exists (select 1 from public.cans where barcode = submission.barcode) then
    raise exception 'This barcode already exists in the official catalogue';
  end if;

  insert into public.cans (barcode, name, brand_id, release_year, flavour, description, image_url, category,
    variant_name, region, edition_type, volume_ml)
  values (submission.barcode, submission.name, submission.brand_id, submission.release_year, submission.flavour,
    submission.description, submission.image_url, submission.category,
    coalesce(nullif(trim(submission.variant_name), ''), 'Standard'), submission.region,
    coalesce(submission.edition_type, 'standard'), submission.volume_ml);

  update public.can_submissions set status = 'approved', reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = submission.id;
end;
$function$;

COMMENT ON TABLE public.can_models IS 'DEPRECATED: catalogue is now Brand -> Can directly';
COMMENT ON COLUMN public.cans.model_id IS 'DEPRECATED: can_models retired';
COMMENT ON COLUMN public.can_submissions.model_id IS 'DEPRECATED: can_models retired';
COMMENT ON COLUMN public.can_reports.model_id IS 'DEPRECATED: can_models retired';