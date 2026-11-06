-- Replace only the Monster can catalogue with the 24 entries from the supplied EnergyLevel spreadsheet.
-- Other brands and their cans are untouched.
-- Existing Monster can records and linked user activity are archived before replacement.
-- The spreadsheet has no verified EANs, so internal identifiers are used in cans.barcode.
-- Caffeine and sugar are converted from per-can totals to the schema's per-100-ml fields.

begin;

-- Resolve the existing Monster brand without creating a duplicate brand row.
insert into public.brands (slug, name, color)
select 'monster', 'Monster Energy', '#7DBA00'
where not exists (
  select 1 from public.brands
  where lower(trim(name)) in ('monster', 'monster energy')
     or slug = 'monster'
);

-- Snapshot the Monster cans and their user-generated/collection data.
insert into public.catalog_cleanup_archive
  (can_id, can_name, brand_name, can_record, user_collection_records, related_records)
select
  c.id,
  c.name,
  b.name,
  to_jsonb(c),
  coalesce((select jsonb_agg(to_jsonb(uc)) from public.user_cans uc where uc.can_id = c.id), '[]'::jsonb),
  jsonb_build_object(
    'comments', coalesce((select jsonb_agg(to_jsonb(cm)) from public.comments cm where cm.can_id = c.id), '[]'::jsonb),
    'comment_likes', coalesce((
      select jsonb_agg(to_jsonb(cl))
      from public.comment_likes cl
      join public.comments cm on cm.id = cl.comment_id
      where cm.can_id = c.id
    ), '[]'::jsonb),
    'ratings', coalesce((select jsonb_agg(to_jsonb(r)) from public.ratings r where r.can_id = c.id), '[]'::jsonb),
    'can_reports', coalesce((select jsonb_agg(to_jsonb(cr)) from public.can_reports cr where cr.can_id = c.id), '[]'::jsonb),
    'user_can_drinks', coalesce((select jsonb_agg(to_jsonb(d)) from public.user_can_drinks d where d.can_id = c.id), '[]'::jsonb),
    'can_barcodes', coalesce((select jsonb_agg(to_jsonb(cb)) from public.can_barcodes cb where cb.can_id = c.id), '[]'::jsonb)
  )
from public.cans c
join public.brands b on b.id = c.brand_id
where lower(trim(b.name)) in ('monster', 'monster energy')
  and not exists (
    select 1 from public.catalog_cleanup_archive a where a.can_id = c.id
  );

-- Remove dependent rows only for Monster cans; the archived snapshot retains them.
delete from public.comment_likes cl
using public.comments cm, public.cans c, public.brands b
where cl.comment_id = cm.id
  and cm.can_id = c.id
  and c.brand_id = b.id
  and lower(trim(b.name)) in ('monster', 'monster energy');

delete from public.comments cm
using public.cans c, public.brands b
where cm.can_id = c.id
  and c.brand_id = b.id
  and lower(trim(b.name)) in ('monster', 'monster energy');

delete from public.ratings r
using public.cans c, public.brands b
where r.can_id = c.id
  and c.brand_id = b.id
  and lower(trim(b.name)) in ('monster', 'monster energy');

delete from public.can_reports cr
using public.cans c, public.brands b
where cr.can_id = c.id
  and c.brand_id = b.id
  and lower(trim(b.name)) in ('monster', 'monster energy');

delete from public.can_barcodes cb
using public.cans c, public.brands b
where cb.can_id = c.id
  and c.brand_id = b.id
  and lower(trim(b.name)) in ('monster', 'monster energy');

delete from public.user_can_drinks d
using public.cans c, public.brands b
where d.can_id = c.id
  and c.brand_id = b.id
  and lower(trim(b.name)) in ('monster', 'monster energy');

delete from public.user_cans uc
using public.cans c, public.brands b
where uc.can_id = c.id
  and c.brand_id = b.id
  and lower(trim(b.name)) in ('monster', 'monster energy');

delete from public.cans c
using public.brands b
where c.brand_id = b.id
  and lower(trim(b.name)) in ('monster', 'monster energy');

-- Insert the new 24-can Monster catalogue.
with monster_brand as (
  select id
  from public.brands
  where lower(trim(name)) in ('monster', 'monster energy')
     or slug = 'monster'
  order by (slug = 'monster') desc
  limit 1
),
items(barcode, name, flavour, caffeine_mg_per_100ml, sugar_g_per_100ml, volume_ml, image_url) as (
values
  ('ENERGYLEVEL-MONSTER-VANILLA-SHOT', 'Vanilla Shot', 'Original, Vanilla', 33.83::numeric, 11.21::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1792401258331-843.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-VICE-GUAVA', 'Ultra Vice Guava', 'Guava', 31.71::numeric, 0.00::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252339422-123.webp'),
  ('ENERGYLEVEL-MONSTER-RIO-PUNCH', 'Rio Punch', 'Mango, Papaya', 32.00::numeric, 7.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1784234832610-791.webp'),
  ('ENERGYLEVEL-MONSTER-JAVA-SALTED-CARAMEL', 'Java Salted Caramel', 'Caramel, Coffee', 45.05::numeric, 4.50::numeric, 444, 'https://energylevel.net/uploads/drinks/drink-1780827674534-874.webp'),
  ('ENERGYLEVEL-MONSTER-MANGO-LOCO', 'Mango Loco', 'Mango', 32.00::numeric, 8.60::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252333178-219.webp'),
  ('ENERGYLEVEL-MONSTER-ELECTRIC-BLUE', 'Electric Blue', 'Raspberry', 33.83::numeric, 11.63::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252342389-575.webp'),
  ('ENERGYLEVEL-MONSTER-MONSTER3', 'Monster3', 'Original', 93.33::numeric, 12.00::numeric, 150, 'https://energylevel.net/uploads/drinks/drink-1780252335711-645.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-PUNK-PUNCH', 'Ultra Punk Punch', '', 33.83::numeric, 0.00::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780829616488-112.webp'),
  ('ENERGYLEVEL-MONSTER-GREEN-NITRO', 'Green Nitro', 'Lemon', 32.00::numeric, 10.80::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252332804-435.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-WHITE', 'Ultra White', 'Citrus', 30.00::numeric, 0.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780776707795-897.webp'),
  ('ENERGYLEVEL-MONSTER-PIPELINE-PUNCH', 'Pipeline Punch', 'Guava, Orange', 32.00::numeric, 8.60::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252330645-802.webp'),
  ('ENERGYLEVEL-MONSTER-VOODOO-GRAPE', 'Voodoo Grape', 'Grape', 33.83::numeric, 11.63::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252342643-979.webp'),
  ('ENERGYLEVEL-MONSTER-PIPELINE-PUNCH-JAPANI', 'Pipeline Punch Japani', 'Guava, Orange', 40.00::numeric, 15.49::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1780771143409-913.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-PEACHY-KEEN', 'Ultra Peachy Keen', 'Peach', 30.00::numeric, 0.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252336068-426.webp'),
  ('ENERGYLEVEL-MONSTER-BLUE-FLASH', 'Blue Flash', 'Blueberry', 32.00::numeric, 10.60::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1786386712122-772.webp'),
  ('ENERGYLEVEL-MONSTER-AUSSIE-LEMONADE', 'Aussie Lemonade', 'Lemon', 32.00::numeric, 8.40::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252331030-203.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-WILD-PASSION', 'Ultra Wild Passion', 'Passion Fruit', 31.71::numeric, 0.00::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252342191-432.webp'),
  ('ENERGYLEVEL-MONSTER-STRAWBERRY-LEMONADE', 'Strawberry Lemonade', 'Lemonade, Strawberry', 33.83::numeric, 10.99::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1783017972140-182.webp'),
  ('ENERGYLEVEL-MONSTER-STRAWBERRY-SHOT-ZERO-SUGAR', 'Strawberry Shot Zero Sugar', 'Original, Strawberry', 33.83::numeric, 0.00::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1782842285335-435.webp'),
  ('ENERGYLEVEL-MONSTER-PACIFIC-PUNCH', 'Pacific Punch', 'Cherry, Guava', 32.00::numeric, 11.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252330837-456.webp'),
  ('ENERGYLEVEL-MONSTER-MONARCH', 'Monarch', 'Nectarine, Peach', 32.00::numeric, 8.80::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252340434-854.webp'),
  ('ENERGYLEVEL-MONSTER-RESERVE-ORANGE-DREAMSICLE', 'Reserve Orange Dreamsicle', 'Orange', 32.00::numeric, 6.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252338204-920.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-BLACK', 'Ultra Black', 'Cherry', 30.00::numeric, 0.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252339622-608.webp'),
  ('ENERGYLEVEL-MONSTER-KHAOTIC', 'Khaotic', 'Fruity', 32.00::numeric, 7.80::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252332445-508.webp')
)
insert into public.cans (
  barcode, name, brand_id, flavour, image_url,
  color_primary, color_secondary, category,
  caffeine_mg_per_100ml, sugar_g_per_100ml, volume_ml
)
select
  items.barcode,
  items.name,
  monster_brand.id,
  nullif(items.flavour, ''),
  items.image_url,
  '#7DBA00',
  '#111111',
  'Energy Drink'::public.can_category,
  items.caffeine_mg_per_100ml,
  items.sugar_g_per_100ml,
  items.volume_ml
from items
cross join monster_brand;

notify pgrst, 'reload schema';
commit;
