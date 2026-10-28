-- Remove Ciao-Energy and consolidate duplicate Bang brand rows.
-- Run after 20261028020000_clean_can_catalog.sql, which archives and removes
-- non-Monster / non-Red Bull can designs from the active catalogue.

do $brand_cleanup$
declare
  ciao_id uuid;
  keep_bang uuid;
  duplicate_bang record;
begin
  -- Ciao-Energy should have no active cans after the catalogue-cleanup migration.
  select id into ciao_id
  from public.brands
  where lower(trim(name)) in ('ciao-energy', 'ciao energy', 'ciao energie')
  order by created_at asc nulls last, id
  limit 1;

  if ciao_id is not null then
    if exists (select 1 from public.cans where brand_id = ciao_id) then
      raise exception 'Ciao-Energy still has active cans. Run 20261028020000_clean_can_catalog.sql first, then retry this migration.';
    end if;

    delete from public.can_models where brand_id = ciao_id;

    if to_regclass('public.can_submissions') is not null then
      execute 'update public.can_submissions set brand_id = null where brand_id = $1'
        using ciao_id;
    end if;

    delete from public.brands where id = ciao_id;
  end if;

  -- Keep the oldest Bang brand and consolidate all duplicate rows into it.
  select id into keep_bang
  from public.brands
  where lower(trim(name)) = 'bang'
  order by created_at asc nulls last, id
  limit 1;

  if keep_bang is not null then
    for duplicate_bang in
      select id from public.brands
      where lower(trim(name)) = 'bang' and id <> keep_bang
    loop
      update public.cans set brand_id = keep_bang where brand_id = duplicate_bang.id;

      delete from public.can_models duplicate_model
      using public.can_models kept_model
      where duplicate_model.brand_id = duplicate_bang.id
        and kept_model.brand_id = keep_bang
        and kept_model.slug = duplicate_model.slug;

      update public.can_models set brand_id = keep_bang where brand_id = duplicate_bang.id;

      if to_regclass('public.can_submissions') is not null then
        execute 'update public.can_submissions set brand_id = $1 where brand_id = $2'
          using keep_bang, duplicate_bang.id;
      end if;

      delete from public.brands where id = duplicate_bang.id;
    end loop;
  end if;
end
$brand_cleanup$;

notify pgrst, 'reload schema';
