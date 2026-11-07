-- Replace the Monster catalogue with the 76 entries from energylevel-net-2026-11-06-2.xlsx.
-- Matching cans keep their IDs and all user activity; only Monster records absent from this
-- import are archived and removed. Other brands are never modified.
-- EnergyLevel caffeine/sugar values are per-can totals; convert them to per-100-ml fields.

begin;

insert into public.brands (slug, name, color)
select 'monster', 'Monster Energy', '#7DBA00'
where not exists (
  select 1 from public.brands
  where slug = 'monster'
     or lower(trim(name)) in ('monster', 'monster energy')
);

create temporary table monster_import (
  barcode text not null,
  name text not null,
  flavour text,
  caffeine_mg_per_100ml numeric,
  sugar_g_per_100ml numeric,
  volume_ml integer,
  image_url text
) on commit drop;

insert into monster_import values
  ('ENERGYLEVEL-MONSTER-VANILLA-SHOT', 'Vanilla Shot', 'Original, Vanilla', 33.83, 11.21, 473, 'https://energylevel.net/uploads/drinks/drink-1792401258331-843.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-VICE-GUAVA', 'Ultra Vice Guava', 'Guava', 31.71, 0.00, 473, 'https://energylevel.net/uploads/drinks/drink-1780252339422-123.webp'),
  ('ENERGYLEVEL-MONSTER-RIO-PUNCH', 'Rio Punch', 'Mango, Papaya', 32.00, 7.00, 500, 'https://energylevel.net/uploads/drinks/drink-1784234832610-791.webp'),
  ('ENERGYLEVEL-MONSTER-JAVA-SALTED-CARAMEL', 'Java Salted Caramel', 'Caramel, Coffee', 45.05, 4.50, 444, 'https://energylevel.net/uploads/drinks/drink-1780827674534-874.webp'),
  ('ENERGYLEVEL-MONSTER-MANGO-LOCO', 'Mango Loco', 'Mango', 32.00, 8.60, 500, 'https://energylevel.net/uploads/drinks/drink-1780252333178-219.webp'),
  ('ENERGYLEVEL-MONSTER-ELECTRIC-BLUE', 'Electric Blue', 'Raspberry', 33.83, 11.63, 473, 'https://energylevel.net/uploads/drinks/drink-1780252342389-575.webp'),
  ('ENERGYLEVEL-MONSTER-MONSTER3', 'Monster3', 'Original', 93.33, 12.00, 150, 'https://energylevel.net/uploads/drinks/drink-1780252335711-645.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-PUNK-PUNCH', 'Ultra Punk Punch', null, 33.83, 0.00, 473, 'https://energylevel.net/uploads/drinks/drink-1780829616488-112.webp'),
  ('ENERGYLEVEL-MONSTER-GREEN-NITRO', 'Green Nitro', 'Lemon', 32.00, 10.80, 500, 'https://energylevel.net/uploads/drinks/drink-1780252332804-435.webp'),
  ('ENERGYLEVEL-MONSTER-PIPELINE-PUNCH', 'Pipeline Punch', 'Guava, Orange, Passion', 32.00, 8.60, 500, 'https://energylevel.net/uploads/drinks/drink-1780252330645-802.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-WHITE', 'Ultra White', 'Citrus', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780776707795-897.webp'),
  ('ENERGYLEVEL-MONSTER-VOODOO-GRAPE', 'Voodoo Grape', 'Grape', 33.83, 11.63, 473, 'https://energylevel.net/uploads/drinks/drink-1780252342643-979.webp'),
  ('ENERGYLEVEL-MONSTER-PIPELINE-PUNCH-JAPANI', 'Pipeline Punch Japani', 'Guava, Orange, Passion Fruit', 40.00, 15.49, 355, 'https://energylevel.net/uploads/drinks/drink-1780771143409-913.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-PEACHY-KEEN', 'Ultra Peachy Keen', 'Peach', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252336068-426.webp'),
  ('ENERGYLEVEL-MONSTER-BLUE-FLASH', 'Blue Flash', 'Blueberry', 32.00, 10.60, 500, 'https://energylevel.net/uploads/drinks/drink-1786386712122-772.webp'),
  ('ENERGYLEVEL-MONSTER-AUSSIE-LEMONADE', 'Aussie Lemonade', 'Lemon', 32.00, 8.40, 500, 'https://energylevel.net/uploads/drinks/drink-1780252331030-203.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-WILD-PASSION', 'Ultra Wild Passion', 'Passion Fruit', 31.71, 0.00, 473, 'https://energylevel.net/uploads/drinks/drink-1780252342191-432.webp'),
  ('ENERGYLEVEL-MONSTER-STRAWBERRY-LEMONADE', 'Strawberry Lemonade', 'Lemonade, Strawberry', 33.83, 10.99, 473, 'https://energylevel.net/uploads/drinks/drink-1783017972140-182.webp'),
  ('ENERGYLEVEL-MONSTER-STRAWBERRY-SHOT-ZERO-SUGAR', 'Strawberry Shot Zero Sugar', 'Original, Strawberry', 33.83, 0.00, 473, 'https://energylevel.net/uploads/drinks/drink-1782842285335-435.webp'),
  ('ENERGYLEVEL-MONSTER-PACIFIC-PUNCH', 'Pacific Punch', 'Cherry, Guava, Orange', 32.00, 11.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252330837-456.webp'),
  ('ENERGYLEVEL-MONSTER-MONARCH', 'Monarch', 'Nectarine, Peach', 32.00, 8.80, 500, 'https://energylevel.net/uploads/drinks/drink-1780252340434-854.webp'),
  ('ENERGYLEVEL-MONSTER-RESERVE-ORANGE-DREAMSICLE', 'Reserve Orange Dreamsicle', 'Orange', 32.00, 6.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252338204-920.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-BLACK', 'Ultra Black', 'Cherry', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252339622-608.webp'),
  ('ENERGYLEVEL-MONSTER-KHAOTIC', 'Khaotic', 'Fruity', 32.00, 7.80, 500, 'https://energylevel.net/uploads/drinks/drink-1780252332445-508.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-RED-WHITE-AND-BLUE-RAZZ', 'Ultra Red White and Blue Razz', 'Raspberry', 33.83, 0.00, 473, 'https://energylevel.net/uploads/drinks/drink-1783018145663-531.webp'),
  ('ENERGYLEVEL-MONSTER-FULL-THROTTLE', 'Full Throttle', null, 32.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780824687661-172.webp'),
  ('ENERGYLEVEL-MONSTER-RESERVE-WHITE-PINEAPPLE', 'Reserve White Pineapple', 'Pineapple', 32.00, 6.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252339226-46.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-PARADISE', 'Ultra Paradise', 'Apple', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780773926673-410.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-BLUE-HAWAIIAN', 'Ultra Blue Hawaiian', 'Banana, Papaya, Passion Fruit', 31.71, 0.00, 473, 'https://energylevel.net/uploads/drinks/drink-1780252340021-519.webp'),
  ('ENERGYLEVEL-MONSTER-VIKING-BERRY', 'Viking Berry', 'Berry', 33.83, 10.36, 473, 'https://energylevel.net/uploads/drinks/drink-1780775553457-586.webp'),
  ('ENERGYLEVEL-MONSTER-MEAN-BEAN', 'Mean Bean', 'Coffee', 45.05, 7.88, 444, 'https://energylevel.net/uploads/drinks/drink-1780252341016-972.webp'),
  ('ENERGYLEVEL-MONSTER-IRISH-CREME', 'Irish Crème', 'Coffee, Cream', 42.28, 6.34, 473, 'https://energylevel.net/uploads/drinks/drink-1789656873400-560.webp'),
  ('ENERGYLEVEL-MONSTER-VANILLA-SHOT-ZERO-SUGAR', 'Vanilla Shot Zero Sugar', 'Original, Vanilla', 33.83, 0.00, 473, 'https://energylevel.net/uploads/drinks/drink-1792401228541-829.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-STRAWBERRY-DREAMS', 'Ultra Strawberry Dreams', 'Strawberry', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252332988-948.webp'),
  ('ENERGYLEVEL-MONSTER-ORANGE-DREAMSICLE', 'Orange Dreamsicle', 'Cream, Orange', 33.83, 9.73, 473, 'https://energylevel.net/uploads/drinks/drink-1783668853586-341.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-GOLDEN-PINEAPPLE', 'Ultra Golden Pineapple', 'Pineapple', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252329879-52.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-ROSA', 'Ultra Rosa', 'Grapefruit, Raspberry, Strawberry', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252335141-340.webp'),
  ('ENERGYLEVEL-MONSTER-ORIGINAL-JAPAN', 'Original Japan', 'Original', 40.00, 15.49, 355, 'https://energylevel.net/uploads/drinks/drink-1780252341792-107.webp'),
  ('ENERGYLEVEL-MONSTER-ZERO-SUGAR', 'Zero Sugar', 'Original', 32.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252337828-652.webp'),
  ('ENERGYLEVEL-MONSTER-THE-DOCTOR', 'The Doctor', 'Citrus', 32.00, 10.80, 500, 'https://energylevel.net/uploads/drinks/drink-1780252338417-139.webp'),
  ('ENERGYLEVEL-MONSTER-DRAGON-ICE-TEA', 'Dragon Ice Tea', 'Lemon', 28.96, 1.27, 473, 'https://energylevel.net/uploads/drinks/drink-1780252336511-261.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-FANTASY-RUBY-RED', 'Ultra Fantasy Ruby Red', 'Grapefruit', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252338627-244.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-RED', 'Ultra Red', 'Berry', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252340231-274.webp'),
  ('ENERGYLEVEL-MONSTER-BAD-APPLE', 'Bad Apple', 'Apple', 32.00, 8.20, 500, 'https://energylevel.net/uploads/drinks/drink-1780775465396-372.webp'),
  ('ENERGYLEVEL-MONSTER-MIXXD', 'Mixxd', 'Apple, Cherry, Grape', 32.00, 9.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252332626-55.webp'),
  ('ENERGYLEVEL-MONSTER-VR46-ZERO-SUGAR', 'VR46 Zero sugar', 'Lemon, Orange', 32.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780859763977-832.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-BLUE', 'Ultra Blue', 'Raspberry', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252334197-702.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-FIESTA-MANGO', 'Ultra Fiesta Mango', 'Mango', 32.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1783499104924-845.webp'),
  ('ENERGYLEVEL-MONSTER-REHAB-GREEN-TEA', 'Rehab Green Tea', 'Tea', 34.93, 0.87, 458, 'https://energylevel.net/uploads/drinks/drink-1780827451728-353.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-SUNRISE', 'Ultra Sunrise', 'Lemon, Orange', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1782986235015-629.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-WATERMELON', 'Ultra Watermelon', 'Watermelon', 32.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780773350726-896.webp'),
  ('ENERGYLEVEL-MONSTER-RIPPER', 'Ripper', 'Guava, Mango, Pineapple', 32.00, 8.40, 500, 'https://energylevel.net/uploads/drinks/drink-1780252334573-848.webp'),
  ('ENERGYLEVEL-MONSTER-REHAB-PEACH-TEA', 'Rehab Peach Tea', 'Peach', 34.93, 0.66, 458, 'https://energylevel.net/uploads/drinks/drink-1780252334383-394.webp'),
  ('ENERGYLEVEL-MONSTER-JAVA-DUBAI-CHOCOLATE', 'Java Dubai Chocolate', 'Chocolate, Pistachio', 45.45, 8.18, 440, 'https://energylevel.net/uploads/drinks/drink-1792401213006-103.webp'),
  ('ENERGYLEVEL-MONSTER-LANDO-NORRIS', 'Lando Norris', 'Melon, Yuzu', 32.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780775494987-438.webp'),
  ('ENERGYLEVEL-MONSTER-NITRO-COSMIC-PEACH', 'Nitro Cosmic Peach', 'Peach', 32.00, 10.60, 500, 'https://energylevel.net/uploads/drinks/drink-1780252335326-928.webp'),
  ('ENERGYLEVEL-MONSTER-REHAB-WILD-BERRY-TEA', 'Rehab Wild Berry Tea', 'Wild Berry', 34.93, 0.66, 458, 'https://energylevel.net/uploads/drinks/drink-1780252340815-407.webp'),
  ('ENERGYLEVEL-MONSTER-ABSOLUTELY-ZERO', 'Absolutely Zero', null, 32.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780829686061-276.webp'),
  ('ENERGYLEVEL-MONSTER-ULTRA-VIOLET', 'Ultra Violet', 'Citrus, Grape', 30.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1786904243923-887.webp'),
  ('ENERGYLEVEL-MONSTER-RESERVE-PEACHES-AND-CREAM', 'Reserve Peaches and Cream', 'Cream, Peach', 33.83, 5.29, 473, 'https://energylevel.net/uploads/drinks/drink-1780775521334-803.webp'),
  ('ENERGYLEVEL-MONSTER-REHAB-LEMONADE', 'Rehab Lemonade', 'Lemon', 32.00, 2.20, 500, 'https://energylevel.net/uploads/drinks/drink-1780252334760-131.webp'),
  ('ENERGYLEVEL-MONSTER-LOCA-MOCA', 'Loca Moca', 'Coffee', 45.05, 7.88, 444, 'https://energylevel.net/uploads/drinks/drink-1780252341218-593.webp'),
  ('ENERGYLEVEL-MONSTER-ORIGINAL', 'Original', 'Original', 32.00, 8.40, 500, 'https://energylevel.net/uploads/drinks/drink-1780826328788-60.webp'),
  ('ENERGYLEVEL-MONSTER-LEWIS-HAMILTON', 'Lewis Hamilton', 'Nectarine, Peach', 32.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780252330261-197.webp'),
  ('ENERGYLEVEL-MONSTER-DRAGON-ICE-TEA-PEACH', 'Dragon Ice Tea Peach', 'Peach', 28.96, 1.27, 473, 'https://energylevel.net/uploads/drinks/drink-1780252337639-217.webp'),
  ('ENERGYLEVEL-MONSTER-KHAOS', 'Khaos', 'Orange', 33.83, 11.63, 473, 'https://energylevel.net/uploads/drinks/drink-1780252335511-663.webp'),
  ('ENERGYLEVEL-MONSTER-ASSAULT', 'Assault', 'Cola', 32.00, 10.80, 500, 'https://energylevel.net/uploads/drinks/drink-1780252339822-642.webp'),
  ('ENERGYLEVEL-MONSTER-MULE', 'Mule', 'Ginger, Lime', 32.00, 0.00, 500, 'https://energylevel.net/uploads/drinks/drink-1782033442373-607.webp'),
  ('ENERGYLEVEL-MONSTER-REHAB-WATERMELON', 'Rehab Watermelon', 'Watermelon', 32.00, 5.80, 500, 'https://energylevel.net/uploads/drinks/drink-1780252329676-383.webp'),
  ('ENERGYLEVEL-MONSTER-ESPRESSO', 'Espresso', 'Coffee', 60.00, 8.00, 250, 'https://energylevel.net/uploads/drinks/drink-1780252334951-413.webp'),
  ('ENERGYLEVEL-MONSTER-SUPERFUEL-WATERMELON', 'SuperFuel Watermelon', 'Watermelon', 29.93, 0.00, 568, 'https://energylevel.net/uploads/drinks/drink-1780252330442-557.webp'),
  ('ENERGYLEVEL-MONSTER-CAFE-LATTE', 'Café Latte', 'Coffee, Cream', 42.28, 7.40, 473, 'https://energylevel.net/uploads/drinks/drink-1789656758542-907.webp'),
  ('ENERGYLEVEL-MONSTER-TRIPLE-SHOT-FRENCH-VANILLA', 'Triple Shot French Vanilla', 'Coffee, Cream, Vanilla', 63.42, 7.19, 473, 'https://energylevel.net/uploads/drinks/drink-1789657031182-760.webp'),
  ('ENERGYLEVEL-MONSTER-REHAB-STRAWBERRY-LEMONADE', 'Rehab Strawberry lemonade', 'Lemon, Strawberry', 34.93, 0.66, 458, 'https://energylevel.net/uploads/drinks/drink-1780252335889-728.webp'),
  ('ENERGYLEVEL-MONSTER-MEAN-GREEN', 'Mean Green', 'Lemon, Lime', 32.00, 11.00, 500, 'https://energylevel.net/uploads/drinks/drink-1780770893134-714.webp'),
  ('ENERGYLEVEL-MONSTER-DRAGON-TEA', 'Dragon Tea', 'Ginseng', 33.83, 0.63, 473, 'https://energylevel.net/uploads/drinks/drink-1780252336707-606.webp');

do $$
declare
  v_brand_id uuid;
begin
  select id into v_brand_id
  from public.brands
  where slug = 'monster'
     or lower(trim(name)) in ('monster', 'monster energy')
  order by (slug = 'monster') desc
  limit 1;

  if v_brand_id is null then
    raise exception 'Monster brand not found; import aborted';
  end if;

  create temporary table monster_obsolete on commit drop as
  select c.id
  from public.cans c
  where c.brand_id = v_brand_id
    and not exists (
      select 1 from monster_import i
      where lower(trim(i.name)) = lower(trim(c.name))
    );

  -- Archive only Monster cans that are no longer in the new spreadsheet.
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
  join monster_obsolete o on o.id = c.id
  where not exists (
    select 1 from public.catalog_cleanup_archive a where a.can_id = c.id
  );

  delete from public.comment_likes cl
  using public.comments cm, monster_obsolete o
  where cl.comment_id = cm.id and cm.can_id = o.id;

  delete from public.comments cm
  using monster_obsolete o
  where cm.can_id = o.id;

  delete from public.ratings r
  using monster_obsolete o
  where r.can_id = o.id;

  delete from public.can_reports cr
  using monster_obsolete o
  where cr.can_id = o.id;

  delete from public.can_barcodes cb
  using monster_obsolete o
  where cb.can_id = o.id;

  delete from public.user_can_drinks d
  using monster_obsolete o
  where d.can_id = o.id;

  delete from public.user_cans uc
  using monster_obsolete o
  where uc.can_id = o.id;

  delete from public.cans c
  using monster_obsolete o
  where c.id = o.id;

  -- Update matching designs in place, preserving can IDs, collections, ratings, comments and Drinks.
  update public.cans c
  set
    name = i.name,
    flavour = i.flavour,
    image_url = i.image_url,
    color_primary = '#7DBA00',
    color_secondary = '#111111',
    category = 'Energy Drink'::public.can_category,
    caffeine_mg_per_100ml = i.caffeine_mg_per_100ml,
    sugar_g_per_100ml = i.sugar_g_per_100ml,
    volume_ml = i.volume_ml
  from monster_import i
  where c.brand_id = v_brand_id
    and lower(trim(c.name)) = lower(trim(i.name));

  -- Add the 76-sheet entries that do not already exist.
  insert into public.cans (
    barcode, name, brand_id, flavour, image_url,
    color_primary, color_secondary, category,
    caffeine_mg_per_100ml, sugar_g_per_100ml, volume_ml
  )
  select
    i.barcode, i.name, v_brand_id, i.flavour, i.image_url,
    '#7DBA00', '#111111', 'Energy Drink'::public.can_category,
    i.caffeine_mg_per_100ml, i.sugar_g_per_100ml, i.volume_ml
  from monster_import i
  where not exists (
    select 1 from public.cans c
    where c.brand_id = v_brand_id
      and lower(trim(c.name)) = lower(trim(i.name))
  );
end $$;

notify pgrst, 'reload schema';
commit;
