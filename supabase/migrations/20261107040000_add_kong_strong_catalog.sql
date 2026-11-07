-- Add the Kong Strong brand and its 14 cans from energylevel-net-2026-11-05-8.xlsx.
-- The spreadsheet contains total caffeine/sugar per can; convert to the app's per-100-ml fields.
-- No verified EANs were supplied, so stable internal identifiers are used instead.
-- Existing brands and can records are untouched. Re-running this migration is safe.

begin;

insert into public.brands (slug, name, color)
select 'kong-strong', 'Kong Strong', '#E64B2D'
where not exists (
  select 1 from public.brands
  where slug = 'kong-strong' or lower(trim(name)) = 'kong strong'
);

with kong as (
  select id
  from public.brands
  where slug = 'kong-strong' or lower(trim(name)) = 'kong strong'
  order by (slug = 'kong-strong') desc
  limit 1
),
items(barcode, name, flavour, caffeine_mg_per_100ml, sugar_g_per_100ml, volume_ml, image_url) as (
values
  ('ENERGYLEVEL-KONG-STRONG-COCONUT-BLUEBERRY', 'Coconut Blueberry', 'Blueberry, Coconut', 32.00::numeric, 9.60::numeric, 250, 'https://energylevel.net/uploads/drinks/drink-1783507053861-119.webp'),
  ('ENERGYLEVEL-KONG-STRONG-MANGO', 'Mango', 'Mango', 32.00::numeric, 5.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252325022-823.webp'),
  ('ENERGYLEVEL-KONG-STRONG-GUAVA', 'Guava', 'Guava', 32.00::numeric, 15.60::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1783506186333-377.webp'),
  ('ENERGYLEVEL-KONG-STRONG-WILD-POWER', 'Wild Power', 'Original', 32.00::numeric, 10.60::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1785403627633-32.webp'),
  ('ENERGYLEVEL-KONG-STRONG-APRICOT-STRAWBERRY', 'Apricot Strawberry', 'Apricot, Strawberry', 32.00::numeric, 9.60::numeric, 250, 'https://energylevel.net/uploads/drinks/drink-1783507360362-321.webp'),
  ('ENERGYLEVEL-KONG-STRONG-URBAN-CLASSIC', 'Urban Classic', 'Original', 32.00::numeric, 9.20::numeric, 250, 'https://energylevel.net/uploads/drinks/drink-1783506899942-4.webp'),
  ('ENERGYLEVEL-KONG-STRONG-MIXED-BERRY', 'Mixed Berry', 'Blackberry, Blueberry', 32.00::numeric, 14.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1783507177788-376.webp'),
  ('ENERGYLEVEL-KONG-STRONG-SUGAR-FREE', 'Sugar Free', 'Original', 32.00::numeric, 0.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780252324651-228.webp'),
  ('ENERGYLEVEL-KONG-STRONG-COLOSSUS-GREEN', 'Colossus (Green)', 'Original', 32.00::numeric, 11.40::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1786639520498-228.webp'),
  ('ENERGYLEVEL-KONG-STRONG-TROPICAL', 'Tropical', 'Apple, Guava', 32.00::numeric, 16.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1786091746739-429.webp'),
  ('ENERGYLEVEL-KONG-STRONG-MANGO-YUZU', 'Mango Yuzu', 'Mango, Yuzu', 30.00::numeric, 10.00::numeric, 250, 'https://energylevel.net/uploads/drinks/drink-1783506648872-572.webp'),
  ('ENERGYLEVEL-KONG-STRONG-ORIGINAL-SUGAR-FREE', 'Original Sugar Free', 'Original', 32.00::numeric, 0.00::numeric, 250, 'https://energylevel.net/uploads/drinks/drink-1785346007256-812.webp'),
  ('ENERGYLEVEL-KONG-STRONG-LEMON', 'Lemon', 'Lemon', 32.00::numeric, 0.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1783592499178-55.webp'),
  ('ENERGYLEVEL-KONG-STRONG-WATERMELON-SUGAR-FREE', 'Watermelon Sugar-Free', 'Watermelon', 32.00::numeric, 0.00::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1783507465473-52.webp')
)
insert into public.cans (
  barcode, name, brand_id, flavour, image_url, color_primary, color_secondary,
  category, caffeine_mg_per_100ml, sugar_g_per_100ml, volume_ml
)
select
  items.barcode, items.name, kong.id, items.flavour, items.image_url,
  '#E64B2D', '#171717', 'Energy Drink'::public.can_category,
  items.caffeine_mg_per_100ml, items.sugar_g_per_100ml, items.volume_ml
from items
cross join kong
where not exists (
  select 1 from public.cans existing
  where existing.barcode = items.barcode
     or (existing.brand_id = kong.id and lower(trim(existing.name)) = lower(trim(items.name)))
);

notify pgrst, 'reload schema';
commit;
