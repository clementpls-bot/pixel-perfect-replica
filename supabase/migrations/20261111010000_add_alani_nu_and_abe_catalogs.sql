-- Add Alani Nu (19 cans) and ABE (13 cans) from the supplied EnergyLevel spreadsheets.
-- Caffeine and sugar are converted from per-can totals to per-100-ml values.
-- No verified EANs were supplied; stable internal identifiers are used.
-- Additive and safe to rerun: existing brands, cans and user activity are preserved.
begin;
insert into public.brands (slug, name, color)
select v.slug, v.name, v.color
from (values ('alani-nu','Alani Nu','#F08AB8'), ('abe','ABE','#3977B8')) as v(slug,name,color)
where not exists (select 1 from public.brands b where b.slug=v.slug or lower(trim(b.name))=lower(trim(v.name)))
on conflict (slug) do nothing;
with brand_ids as (
 select id, case when slug='alani-nu' or lower(trim(name))='alani nu' then 'alani-nu'
                 when slug='abe' or lower(trim(name))='abe' then 'abe' end as slug
 from public.brands where slug in ('alani-nu','abe') or lower(trim(name)) in ('alani nu','abe')
),
items(barcode,name,flavour,caffeine_mg_per_100ml,sugar_g_per_100ml,volume_ml,image_url,brand_slug) as (
values
  ('ENERGYLEVEL-ALANI-NU-LIME-SLUSH', 'Lime Slush', 'Lime, Slushie', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1793685114244-446.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-WITCHS-BREW', 'Witch’s Brew', 'Apple, Caramel', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1792596446126-517.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-SHERBET-SWIRL', 'Sherbet Swirl', 'Lime, Orange', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627471734-292.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-STRAWBERRY-SUNRISE', 'Strawberry Sunrise', 'Strawberry', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627067517-911.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-CHERRY-SLUSH', 'Cherry Slush', 'Cherry, Slush', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627341268-646.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-KIMADE', 'Kimade', null, 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1780771241427-576.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-JUICY-PEACH', 'Juicy Peach', 'Peach', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1787491219597-596.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-DREAM-FLOAT', 'Dream Float', 'Orange, Sherbet', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627174881-6.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-COSMIC-STARDUST', 'Cosmic Stardust', 'Fruity', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627418850-337.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-RUBY-APPLE', 'Ruby Apple', 'Apple, Caramel', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1792596558527-196.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-ORANGE-KISS', 'Orange Kiss', 'Citrus, Orange', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627214333-527.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-PURPLE-COTTON-CANDY', 'Purple Cotton Candy', 'Cotton Candy, Grape', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627013478-618.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-PINK-SLUSH', 'Pink Slush', 'Cream, Strawberry', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627109912-30.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-COTTON-CANDY', 'Cotton Candy', 'Cotton Candy', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627728190-585.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-HAWAIIAN-SHAVED-ICE', 'Hawaiian Shaved Ice', 'Coconut, Strawberry', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627253623-351.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-BLUE-SLUSH', 'Blue Slush', 'Raspberry', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1781627383541-271.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-BREEZEBERRY', 'Breezeberry', 'Citrus, Raspberry', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627552645-573.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-WATERMELON-WAVE', 'Watermelon Wave', 'Lemon, Watermelon', 56.34::numeric, 0::numeric, 355, 'https://energylevel.net/uploads/drinks/drink-1781627513864-671.webp', 'alani-nu'),
  ('ENERGYLEVEL-ALANI-NU-CHERRY-TWIST', 'Cherry Twist', 'Cherry', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1781627304086-695.webp', 'alani-nu'),
  ('ENERGYLEVEL-ABE-ORANGE-BURST', 'Orange Burst', 'Citrus, Orange', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413530556-3.webp', 'abe'),
  ('ENERGYLEVEL-ABE-BLUE-LAGOON', 'Blue Lagoon', 'Blueberry, Citrus, Lemon', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413168478-535.webp', 'abe'),
  ('ENERGYLEVEL-ABE-APPLE-BURST', 'Apple Burst', 'Apple, Elderflower', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413050836-635.webp', 'abe'),
  ('ENERGYLEVEL-ABE-CHERRY-SLUSHIE', 'Cherry Slushie', 'Cherry', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413237790-665.webp', 'abe'),
  ('ENERGYLEVEL-ABE-WHITE', 'White', 'Citrus, Grapefruit', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413604772-133.webp', 'abe'),
  ('ENERGYLEVEL-ABE-FRUIT-CANDY', 'Fruit Candy', 'Berry, Strawberry', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413380552-926.webp', 'abe'),
  ('ENERGYLEVEL-ABE-CLOUDY-LEMONADE', 'Cloudy Lemonade', 'Citrus, Lemon', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413301809-754.webp', 'abe'),
  ('ENERGYLEVEL-ABE-SLUSH-PUPPIE', 'Slush Puppie', 'Cherry, Raspberry', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413559069-878.webp', 'abe'),
  ('ENERGYLEVEL-ABE-ENERGY-FLAVOUR', 'Energy Flavour', 'Original', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413349716-787.webp', 'abe'),
  ('ENERGYLEVEL-ABE-GRAPE-SODA', 'Grape Soda', 'Grape', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413416215-967.webp', 'abe'),
  ('ENERGYLEVEL-ABE-BADDY-BERRY', 'Baddy Berry', 'Blackberry, Cherry, Strawberry', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413658331-963.webp', 'abe'),
  ('ENERGYLEVEL-ABE-CHIQUITA-FRUIT-BLEND', 'Chiquita Fruit Blend', 'Cherry, Kiwi, Orange', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413818027-7.webp', 'abe'),
  ('ENERGYLEVEL-ABE-CHIQUITA-PINEAPPLE-STRAWBERRY', 'Chiquita Pineapple Strawberry', 'Pineapple, Strawberry', 60.61::numeric, 0::numeric, 330, 'https://energylevel.net/uploads/drinks/drink-1783413748784-405.webp', 'abe')
)
insert into public.cans (barcode,name,brand_id,flavour,image_url,color_primary,color_secondary,category,caffeine_mg_per_100ml,sugar_g_per_100ml,volume_ml)
select items.barcode,items.name,brand_ids.id,items.flavour,items.image_url,
 case items.brand_slug when 'alani-nu' then '#F08AB8' else '#3977B8' end,
 '#171717','Energy Drink'::public.can_category,items.caffeine_mg_per_100ml,items.sugar_g_per_100ml,items.volume_ml
from items join brand_ids on brand_ids.slug=items.brand_slug
where not exists (select 1 from public.cans existing where existing.barcode=items.barcode
 or (existing.brand_id=brand_ids.id and lower(trim(existing.name))=lower(trim(items.name))));
notify pgrst, 'reload schema';
commit;