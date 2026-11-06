-- Import the 18 Ghost Energy products supplied in energylevel-net-2026-11-05-7.xlsx.
-- EnergyLevel provides total caffeine per can; convert it to the app's mg/100 ml field.
-- No EAN/barcodes were present in the spreadsheet, so stable internal catalog identifiers
-- are used. Replace them with verified can EANs before relying on barcode scanning.
-- Product images remain hosted by EnergyLevel and are referenced directly.

insert into public.brands (slug, name, color, logo_url)
select
  'ghost',
  'Ghost',
  '#B9FF00',
  'https://www.google.com/s2/favicons?domain=ghostlifestyle.com&sz=128'
where not exists (
  select 1 from public.brands
  where slug = 'ghost' or lower(trim(name)) = 'ghost'
);

with ghost as (
  select id
  from public.brands
  where slug = 'ghost' or lower(trim(name)) = 'ghost'
  order by (slug = 'ghost') desc
  limit 1
),
items(barcode, name, flavour, caffeine_mg_per_100ml, sugar_g_per_100ml, volume_ml, image_url) as (
values
  ('ENERGYLEVEL-GHOST-7UP', 'Ghost 7up', 'Lemon, Lime', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1782642023849-925.webp'),
  ('ENERGYLEVEL-GHOST-SWEDISH-FISH', 'Ghost Swedish Fish', 'Candy', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1782641876018-857.webp'),
  ('ENERGYLEVEL-GHOST-PINK-LEMONADE', 'Ghost Pink Lemonade', 'Berry, Lemon', 32.00::numeric, 0::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780859454601-503.webp'),
  ('ENERGYLEVEL-GHOST-WELCHS-GRAPE', 'Ghost Welch''s Grape', 'Grape', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1792323407123-859.webp'),
  ('ENERGYLEVEL-GHOST-RASPBERRY-CREAM', 'Ghost Raspberry Cream', 'Cream, Raspberry', 31.92::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1792323251320-607.webp'),
  ('ENERGYLEVEL-GHOST-AW-ROOT-BEER', 'Ghost A&W Root Beer', 'Root Beer', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1786096788079-564.webp'),
  ('ENERGYLEVEL-GHOST-STRAWBANGO', 'Ghost Strawbango', 'Mango, Strawberry', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1787491276469-26.webp'),
  ('ENERGYLEVEL-GHOST-SOUR-PATCH-KIDS-BLUE-RASPBERRY', 'Ghost Sour Patch Kids Blue Raspberry', 'Raspberry', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252291101-925.webp'),
  ('ENERGYLEVEL-GHOST-ELECTRIC-LEMONADE', 'Ghost Electric Lemonade', 'Lime', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252292317-429.webp'),
  ('ENERGYLEVEL-GHOST-CHERRY-LIMEADE', 'Ghost Cherry Limeade', 'Cherry, Lime', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252291293-675.webp'),
  ('ENERGYLEVEL-GHOST-SOUR-STRIPS', 'Ghost Sour Strips', '', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1782641892509-468.webp'),
  ('ENERGYLEVEL-GHOST-MERICA-POP', 'Ghost ''Merica Pop', 'Cherry, Lemon', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252292922-223.webp'),
  ('ENERGYLEVEL-GHOST-ORIGINAL', 'Ghost Original', '', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252291740-956.webp'),
  ('ENERGYLEVEL-GHOST-ORANGE-CREAM', 'Ghost Orange Cream', 'Cream, Orange', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252292636-576.webp'),
  ('ENERGYLEVEL-GHOST-BLUE-RASPBERRY', 'Ghost Blue Raspberry', 'Raspberry', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1782641795705-305.webp'),
  ('ENERGYLEVEL-GHOST-WARHEADS-SOUR-WATERMELON', 'Ghost Warheads Sour Watermelon', 'Sour, Watermelon', 32.00::numeric, 0::numeric, 500, 'https://energylevel.net/uploads/drinks/drink-1780859441662-360.webp'),
  ('ENERGYLEVEL-GHOST-PEACHES', 'Ghost Peaches', 'Peach', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1780252293522-944.webp'),
  ('ENERGYLEVEL-GHOST-ICED-TEA-LEMONADE', 'Ghost Iced-Tea Lemonade', 'Iced Tea, Lemonade', 42.28::numeric, 0::numeric, 473, 'https://energylevel.net/uploads/drinks/drink-1792475328399-340.webp')
)
insert into public.cans (
  barcode,
  name,
  brand_id,
  flavour,
  image_url,
  color_primary,
  color_secondary,
  category,
  caffeine_mg_per_100ml,
  sugar_g_per_100ml,
  volume_ml
)
select
  items.barcode,
  items.name,
  ghost.id,
  nullif(items.flavour, ''),
  items.image_url,
  '#B9FF00',
  '#171717',
  'Energy Drink'::public.can_category,
  items.caffeine_mg_per_100ml,
  items.sugar_g_per_100ml,
  items.volume_ml
from items
cross join ghost
where not exists (
  select 1
  from public.cans existing
  where existing.barcode = items.barcode
     or (existing.brand_id = ghost.id and lower(existing.name) = lower(items.name))
);

notify pgrst, 'reload schema';
