CREATE TABLE public.can_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  flavour text,
  description text,
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, slug)
);
GRANT SELECT ON public.can_models TO anon, authenticated;
GRANT INSERT, UPDATE ON public.can_models TO authenticated;
GRANT ALL ON public.can_models TO service_role;
ALTER TABLE public.can_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "can_models public read" ON public.can_models FOR SELECT USING (true);
CREATE POLICY "Admins manage can models" ON public.can_models FOR ALL TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

ALTER TABLE public.cans
  ADD COLUMN model_id uuid REFERENCES public.can_models(id) ON DELETE SET NULL,
  ADD COLUMN variant_name text NOT NULL DEFAULT 'Standard',
  ADD COLUMN region text,
  ADD COLUMN edition_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN tab_color text,
  ADD COLUMN notes text;
ALTER TABLE public.cans ADD CONSTRAINT cans_edition_type_check
  CHECK (edition_type IN ('standard','limited','collab','import','redesign'));
CREATE INDEX cans_model_id_idx ON public.cans(model_id);

INSERT INTO public.can_models (brand_id, slug, name, flavour, description, cover_image_url)
SELECT DISTINCT ON (c.brand_id, s.slug) c.brand_id, s.slug, c.name, c.flavour, c.description, c.image_url
FROM public.cans c
CROSS JOIN LATERAL (SELECT trim(both '-' from regexp_replace(lower(c.name), '[^a-z0-9]+', '-', 'g')) AS slug) s
ORDER BY c.brand_id, s.slug, c.created_at;

UPDATE public.cans c SET model_id = m.id
FROM public.can_models m
WHERE m.brand_id = c.brand_id
  AND m.slug = trim(both '-' from regexp_replace(lower(c.name), '[^a-z0-9]+', '-', 'g'));

ALTER TABLE public.user_cans ADD COLUMN condition text NOT NULL DEFAULT 'full';
ALTER TABLE public.user_cans ADD CONSTRAINT user_cans_condition_check
  CHECK (condition IN ('full','empty','empty_bottom_opened'));
ALTER TABLE public.user_cans DROP CONSTRAINT user_cans_user_id_can_id_key;
ALTER TABLE public.user_cans ADD CONSTRAINT user_cans_user_can_condition_key UNIQUE (user_id, can_id, condition);

ALTER TABLE public.can_submissions
  ADD COLUMN model_id uuid REFERENCES public.can_models(id) ON DELETE SET NULL,
  ADD COLUMN variant_name text,
  ADD COLUMN region text,
  ADD COLUMN edition_type text,
  ADD COLUMN volume_ml integer;
ALTER TABLE public.can_reports ADD COLUMN model_id uuid REFERENCES public.can_models(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.approve_can_submission(p_submission_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare
  submission public.can_submissions%rowtype;
  v_model uuid;
  v_slug text;
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

  v_model := submission.model_id;
  if v_model is null then
    v_slug := trim(both '-' from regexp_replace(lower(submission.name), '[^a-z0-9]+', '-', 'g'));
    select id into v_model from public.can_models where brand_id = submission.brand_id and slug = v_slug;
    if v_model is null then
      insert into public.can_models (brand_id, slug, name, flavour, description, cover_image_url)
      values (submission.brand_id, v_slug, submission.name, submission.flavour, submission.description, submission.image_url)
      returning id into v_model;
    end if;
  end if;

  insert into public.cans (barcode, name, brand_id, release_year, flavour, description, image_url, category,
    model_id, variant_name, region, edition_type, volume_ml)
  values (submission.barcode, submission.name, submission.brand_id, submission.release_year, submission.flavour,
    submission.description, submission.image_url, submission.category,
    v_model, coalesce(nullif(trim(submission.variant_name), ''), 'Standard'), submission.region,
    coalesce(submission.edition_type, 'standard'), submission.volume_ml);

  update public.can_submissions set status = 'approved', reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = submission.id;
end;
$function$;