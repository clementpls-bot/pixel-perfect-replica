-- Clean the public can catalogue while preserving a private snapshot of removed designs and collection rows.
create table if not exists public.catalog_cleanup_archive (
  id uuid primary key default gen_random_uuid(),
  can_id uuid not null,
  can_name text not null,
  brand_name text,
  can_record jsonb not null,
  user_collection_records jsonb not null default '[]'::jsonb,
  related_records jsonb not null default '{}'::jsonb,
  archived_at timestamptz not null default now()
);
revoke all on public.catalog_cleanup_archive from anon, authenticated, public;

insert into public.catalog_cleanup_archive (can_id, can_name, brand_name, can_record, user_collection_records)
select c.id, c.name, b.name, to_jsonb(c),
  coalesce((select jsonb_agg(to_jsonb(uc)) from public.user_cans uc where uc.can_id = c.id), '[]'::jsonb),
  jsonb_build_object(
    'comments', coalesce((select jsonb_agg(to_jsonb(cm)) from public.comments cm where cm.can_id = c.id), '[]'::jsonb),
    'ratings', coalesce((select jsonb_agg(to_jsonb(r)) from public.ratings r where r.can_id = c.id), '[]'::jsonb),
    'can_reports', coalesce((select jsonb_agg(to_jsonb(cr)) from public.can_reports cr where cr.can_id = c.id), '[]'::jsonb),
    'user_can_drinks', case when to_regclass('public.user_can_drinks') is not null then
      (select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) from public.user_can_drinks d where d.can_id = c.id)
      else '[]'::jsonb end
  )
from public.cans c left join public.brands b on b.id = c.brand_id
where lower(trim(coalesce(b.name, ''))) not in ('monster', 'red bull')
  and not exists (select 1 from public.catalog_cleanup_archive archived where archived.can_id = c.id);

-- Only Monster and Red Bull can designs remain in the active catalogue.
delete from public.cans c using public.brands b
where b.id = c.brand_id and lower(trim(b.name)) not in ('monster', 'red bull');

-- Keep the oldest Burn brand row and move known foreign keys before deleting duplicates.
do $$
declare
  keep_burn uuid;
  duplicate_burn record;
  ciao_brand uuid;
  brand_id_nullable boolean;
begin
  select id into keep_burn from public.brands
  where lower(trim(name)) = 'burn'
  order by created_at asc nulls last, id limit 1;

  if keep_burn is not null then
    for duplicate_burn in select id from public.brands
      where lower(trim(name)) = 'burn' and id <> keep_burn
    loop
      update public.cans set brand_id = keep_burn where brand_id = duplicate_burn.id;
      update public.can_models set brand_id = keep_burn where brand_id = duplicate_burn.id;
      if to_regclass('public.can_submissions') is not null then
        update public.can_submissions set brand_id = keep_burn where brand_id = duplicate_burn.id;
      end if;
      delete from public.brands where id = duplicate_burn.id;
    end loop;
  end if;

  select id into ciao_brand from public.brands
  where lower(trim(name)) = 'ciao energie'
  order by created_at asc nulls last, id limit 1;

  if ciao_brand is not null then
    delete from public.can_models where brand_id = ciao_brand;
    if to_regclass('public.can_submissions') is not null then
      select is_nullable = 'YES' into brand_id_nullable
      from information_schema.columns where table_schema = 'public'
        and table_name = 'can_submissions' and column_name = 'brand_id';
      if coalesce(brand_id_nullable, false) then
        update public.can_submissions set brand_id = null where brand_id = ciao_brand;
      else
        raise exception 'Ciao Energie is referenced by can_submissions and brand_id is NOT NULL; resolve submissions before retrying.';
      end if;
    end if;
    delete from public.brands where id = ciao_brand;
  end if;
end $$;

notify pgrst, 'reload schema';
