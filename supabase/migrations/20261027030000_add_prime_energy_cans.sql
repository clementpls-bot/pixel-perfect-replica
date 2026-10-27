-- Add the PRIME ENERGY brand and the eight cans listed by Energy Drink Mania.
-- Product photos are hot-linked to the source pages' can images; please replace with
-- locally hosted/licensed images if the source site does not permit hot-linking.
insert into public.brands (slug, name, color)
values ('prime', 'PRIME ENERGY', '#16a6a1')
on conflict (slug) do update
set name = excluded.name,
    color = excluded.color;

with prime as (
  select id from public.brands where slug = 'prime' limit 1
),
items(barcode, name, release_year, flavour, description, historical_context, image_url, color_primary, color_secondary, caffeine, sugar, taurine, kcal, volume_ml) as (
  values
  ('CATALOG-PRIME-ENERGY-DREAM-POP', 'PRIME ENERGY Dream Pop', 2024, 'Orange cream', 'Saveur orange crémeuse, avec un design dégradé orange et des illustrations évoquant la glace.', 'Présentée par Energy Drink Mania comme la huitième saveur de la gamme, lancée à la fin du mois de mai 2024.', 'https://www.energydrinkmania.net/prime_energy_drink/prime_energy_dream_pop001.jpg', '#f5a044', '#ef7d37', 56.34::numeric, null::numeric, null::numeric, 2.82::numeric, 355),
  ('CATALOG-PRIME-ENERGY-ORIGINAL', 'PRIME ENERGY Original', 2023, 'Bubble-gum, agrumes', 'La version Original se distingue par une canette noire et blanche au style dessiné à la main.', 'Selon Energy Drink Mania, la version Original est sortie en octobre 2023.', 'https://www.energydrinkmania.net/prime_energy_drink/prime_energy_original001.jpg', '#222222', '#eeeeee', 56.34::numeric, null::numeric, null::numeric, 2.82::numeric, 355),
  ('CATALOG-PRIME-ENERGY-ICE-POP', 'PRIME ENERGY Ice Pop', 2023, 'Glace à l’eau fruitée', 'Un design glacé inspiré des glaces américaines multicolores.', 'Ajoutée après les cinq saveurs initiales de la gamme PRIME ENERGY.', 'https://www.energydrinkmania.net/prime_energy_drink/prime_energy_ice_pop001.jpg', '#2d91dc', '#ef4e63', 56.34::numeric, null::numeric, null::numeric, 2.82::numeric, 355),
  ('CATALOG-PRIME-ENERGY-ORANGE-MANGO', 'PRIME ENERGY Orange Mango', 2023, 'Orange, mangue', 'Une association fruitée d’orange et de mangue.', 'Saveur lancée en janvier 2023, décrite par Energy Drink Mania comme une saveur propre à la gamme ENERGY.', 'https://www.energydrinkmania.net/prime_energy_drink/prime_enery_orange_mango001.jpg', '#f28c28', '#ffbf45', 56.34::numeric, null::numeric, null::numeric, 2.82::numeric, 355),
  ('CATALOG-PRIME-ENERGY-STRAWBERRY-WATERMELON', 'PRIME ENERGY Strawberry Watermelon', 2023, 'Fraise, pastèque', 'Un profil fraise-pastèque sur une canette rose et rouge.', 'Une des cinq saveurs du lancement initial de PRIME ENERGY en janvier 2023.', 'https://www.energydrinkmania.net/prime_energy_drink/prime_energy_strawberry_watermelon001.jpg', '#e94f83', '#ef5962', 56.34::numeric, null::numeric, null::numeric, 2.82::numeric, 355),
  ('CATALOG-PRIME-ENERGY-LEMON-LIME', 'PRIME ENERGY Lemon Lime', 2023, 'Citron, citron vert', 'Une saveur citron-citron vert avec une canette vert vif.', 'Une des cinq saveurs du lancement initial de PRIME ENERGY en janvier 2023.', 'https://www.energydrinkmania.net/prime_energy_drink/prime_energy_lemon_lime001.jpg', '#a6ce39', '#e6e85b', 56.34::numeric, null::numeric, null::numeric, 2.82::numeric, 355),
  ('CATALOG-PRIME-ENERGY-BLUE-RASPBERRY', 'PRIME ENERGY Blue Raspberry', 2023, 'Framboise bleue', 'Une saveur framboise bleue reconnaissable à son univers bleu électrique.', 'Une des cinq saveurs du lancement initial de PRIME ENERGY en janvier 2023.', 'https://www.energydrinkmania.net/prime_energy_drink/prime_energy_blue_raspberry001.jpg', '#1675d1', '#56b8f3', 56.34::numeric, null::numeric, null::numeric, 2.82::numeric, 355),
  ('CATALOG-PRIME-ENERGY-TROPICAL-PUNCH', 'PRIME ENERGY Tropical Punch', 2023, 'Punch de fruits', 'Un mélange fruité tropical dans une canette aux tons violets.', 'Une des cinq saveurs du lancement initial de PRIME ENERGY en janvier 2023.', 'https://www.energydrinkmania.net/prime_energy_drink/prime_energy_tropical_punch001.jpg', '#6f3a9c', '#e94b55', 56.34::numeric, null::numeric, null::numeric, 2.82::numeric, 355)
)
insert into public.cans (
  barcode, name, brand_id, release_year, flavour, description, historical_context,
  image_url, color_primary, color_secondary, category,
  caffeine_mg_per_100ml, sugar_g_per_100ml, taurine_mg_per_100ml,
  energy_kcal_per_100ml, volume_ml, history_verified
)
select
  items.barcode, items.name, prime.id, items.release_year, items.flavour, items.description,
  items.historical_context, items.image_url, items.color_primary, items.color_secondary,
  'Energy Drink'::public.can_category,
  items.caffeine, items.sugar, items.taurine, items.kcal, items.volume_ml, false
from items
cross join prime
where not exists (
  select 1 from public.cans existing where existing.barcode = items.barcode
);
