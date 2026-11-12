-- Add the HELL Energy and V Energy catalogues from the supplied EnergyLevel exports.
-- The source exports provide per-can nutrition totals; values below are normalized per 100 ml.
-- Synthetic internal barcode placeholders are used because the spreadsheets do not contain EAN/UPC codes.
do $$
declare
  hell_id uuid;
  v_id uuid;
begin
  select id into hell_id from public.brands where slug = 'hell' limit 1;
  if hell_id is null then
    insert into public.brands (name, slug, color)
    values ('HELL Energy', 'hell', '#F0003C')
    returning id into hell_id;
  else
    update public.brands set name = 'HELL Energy', color = '#F0003C' where id = hell_id;
  end if;

  select id into v_id from public.brands where slug = 'v-energy' limit 1;
  if v_id is null then
    insert into public.brands (name, slug, color)
    values ('V Energy', 'v-energy', '#00B14F')
    returning id into v_id;
  else
    update public.brands set name = 'V Energy', color = '#00B14F' where id = v_id;
  end if;

  insert into public.cans (
    brand_id, name, variant_name, barcode, flavour, sugar_g_per_100ml,
    caffeine_mg_per_100ml, volume_ml, image_url, color_primary,
    color_secondary, category, edition_type, history_verified
  )
  select hell_id, x.name, x.name, x.barcode, x.flavour, x.sugar_100,
         x.caffeine_100, x.volume_ml, x.image_url, '#F0003C',
         '#171923', 'Energy Drink'::public.can_category, 'standard', false
  from (values
      ('Black Cherry', 'Cherry', 10.80, 32.00, 250, 'EL-HELL-BLACK-CHERRY', 'https://energylevel.net/uploads/drinks/drink-1792437140258-206.webp'),
      ('Peach-Lemon', 'Peach, Watermelon', 11.20, 32.00, 250, 'EL-HELL-PEACH-LEMON', 'https://energylevel.net/uploads/drinks/drink-1781633697477-413.webp'),
      ('Strong Watermelon', 'Watermelon', 11.00, 38.40, 500, 'EL-HELL-STRONG-WATERMELON', 'https://energylevel.net/uploads/drinks/drink-1781633075548-237.webp'),
      ('Strong Apple', 'Apple', 10.80, 38.40, 250, 'EL-HELL-STRONG-APPLE', 'https://energylevel.net/uploads/drinks/drink-1781633382796-295.webp'),
      ('Strong Redgrape', 'Red Grape', 11.20, 38.40, 250, 'EL-HELL-STRONG-REDGRAPE', 'https://energylevel.net/uploads/drinks/drink-1781632878254-812.webp'),
      ('Classic', 'Original', 10.80, 32.00, 250, 'EL-HELL-CLASSIC', 'https://energylevel.net/uploads/drinks/drink-1780252300401-55.webp'),
      ('Cactus Twist', 'Lemon, Strawberry', 10.00, 32.00, 250, 'EL-HELL-CACTUS-TWIST', 'https://energylevel.net/uploads/drinks/drink-1791967569748-259.webp'),
      ('Pomegranate', 'Pomegranate', 0.00, 32.00, 500, 'EL-HELL-POMEGRANATE', 'https://energylevel.net/uploads/drinks/drink-1789665237491-231.webp'),
      ('Redcurrant grapefruit', 'Grapefruit, Redcurrant', 10.80, 32.00, 250, 'EL-HELL-REDCURRANT-GRAPEFRUIT', 'https://energylevel.net/uploads/drinks/drink-1780252300597-257.webp'),
      ('Classic Zero', 'Original', 0.00, 32.00, 250, 'EL-HELL-CLASSIC-ZERO', 'https://energylevel.net/uploads/drinks/drink-1780859159263-729.webp'),
      ('Lemon-Pink Grapefruit', 'Grapefruit, Lemon', 10.80, 32.00, 250, 'EL-HELL-LEMON-PINK-GRAPEFRUIT', 'https://energylevel.net/uploads/drinks/drink-1792437103011-604.webp'),
      ('Apple Pie', 'Apple, Cinnamon', 10.80, 32.00, 250, 'EL-HELL-APPLE-PIE', 'https://energylevel.net/uploads/drinks/drink-1790496959206-283.webp'),
      ('Elderflower', 'Elderflower', 11.20, 32.00, 250, 'EL-HELL-ELDERFLOWER', 'https://energylevel.net/uploads/drinks/drink-1781633589240-445.webp'),
      ('Groovy Grapefruit', 'Grapefruit', 11.20, 32.00, 250, 'EL-HELL-GROOVY-GRAPEFRUIT', 'https://energylevel.net/uploads/drinks/drink-1781632973696-291.webp'),
      ('Nova', 'Cherry', 10.80, 32.00, 250, 'EL-HELL-NOVA', 'https://energylevel.net/uploads/drinks/drink-1781632507389-149.webp'),
      ('Strawberry', 'Strawberry', 0.00, 32.00, 250, 'EL-HELL-STRAWBERRY', 'https://energylevel.net/uploads/drinks/drink-1781632651018-701.webp'),
      ('Strawberry Rhubarb', 'Rhubarb, Strawberry', 0.00, 32.00, 250, 'EL-HELL-STRAWBERRY-RHUBARB', 'https://energylevel.net/uploads/drinks/drink-1781633480523-52.webp')
  ) as x(name, flavour, sugar_100, caffeine_100, volume_ml, barcode, image_url)
  where not exists (
    select 1 from public.cans c
    where c.brand_id = hell_id and lower(c.name) = lower(x.name)
  );

  insert into public.cans (
    brand_id, name, variant_name, barcode, flavour, sugar_g_per_100ml,
    caffeine_mg_per_100ml, volume_ml, image_url, color_primary,
    color_secondary, category, edition_type, history_verified
  )
  select v_id, x.name, x.name, x.barcode, x.flavour, x.sugar_100,
         x.caffeine_100, x.volume_ml, x.image_url, '#00B14F',
         '#171923', 'Energy Drink'::public.can_category, 'standard', false
  from (values
      ('Blue', 'Mystery', 13.80, 31.00, 500, 'EL-V-BLUE', 'https://energylevel.net/uploads/drinks/drink-1783104092482-676.webp'),
      ('Black', 'Citrus, Coffee', 10.60, 31.40, 500, 'EL-V-BLACK', 'https://energylevel.net/uploads/drinks/drink-1783104327362-105.webp'),
      ('Blue Sugar-Free', 'Mystery', 0.00, 31.00, 500, 'EL-V-BLUE-SUGAR-FREE', 'https://energylevel.net/uploads/drinks/drink-1783104182589-257.webp'),
      ('Grape Burst', 'Grape', 10.80, 31.00, 500, 'EL-V-GRAPE-BURST', 'https://energylevel.net/uploads/drinks/drink-1783104493846-185.webp'),
      ('Original', 'Guarana, Original', 10.60, 31.00, 500, 'EL-V-ORIGINAL', 'https://energylevel.net/uploads/drinks/drink-1783104054804-932.webp'),
      ('Refresh Apple', 'Apple', 0.00, 31.00, 500, 'EL-V-REFRESH-APPLE', 'https://energylevel.net/uploads/drinks/drink-1783103914770-403.webp'),
      ('Refresh Blackcurrant & Yuzu', 'Blackcurrant, Yuzu', 0.00, 31.00, 500, 'EL-V-REFRESH-BLACKCURRANT-YUZU', 'https://energylevel.net/uploads/drinks/drink-1783103975181-193.webp'),
      ('Refresh Citrus Lemonade', 'Lemon, Lime', 0.00, 31.00, 500, 'EL-V-REFRESH-CITRUS-LEMONADE', 'https://energylevel.net/uploads/drinks/drink-1783104015435-686.webp'),
      ('Refresh Pineapple & Watermelon', 'Pineapple, Watermelon', 0.00, 31.00, 500, 'EL-V-REFRESH-PINEAPPLE-WATERMELON', 'https://energylevel.net/uploads/drinks/drink-1783103863848-407.webp'),
      ('Riise Sparkling Blackcurrant', 'Blackcurrant', 0.00, 31.00, 500, 'EL-V-RIISE-SPARKLING-BLACKCURRANT', 'https://energylevel.net/uploads/drinks/drink-1783104667839-589.webp'),
      ('Riise Sparkling Mandarin', 'Mandarin', 0.00, 31.00, 500, 'EL-V-RIISE-SPARKLING-MANDARIN', 'https://energylevel.net/uploads/drinks/drink-1783104699401-312.webp'),
      ('Strawberries & Cream', 'Strawberry, Cream', 0.00, 31.20, 250, 'EL-V-STRAWBERRIES-CREAM', 'https://energylevel.net/uploads/drinks/drink-1783104455670-632.webp'),
      ('Strawberry Crush', 'Strawberry', 10.80, 31.00, 500, 'EL-V-STRAWBERRY-CRUSH', 'https://energylevel.net/uploads/drinks/drink-1783104592018-531.webp'),
      ('Sugar-Free', 'Original', 0.00, 31.00, 500, 'EL-V-SUGAR-FREE', 'https://energylevel.net/uploads/drinks/drink-1783104150336-133.webp'),
      ('Watermelon Candy', 'Watermelon', 0.00, 31.20, 250, 'EL-V-WATERMELON-CANDY', 'https://energylevel.net/uploads/drinks/drink-1783104422297-634.webp')
  ) as x(name, flavour, sugar_100, caffeine_100, volume_ml, barcode, image_url)
  where not exists (
    select 1 from public.cans c
    where c.brand_id = v_id and lower(c.name) = lower(x.name)
  );
end $$;

notify pgrst, 'reload schema';
