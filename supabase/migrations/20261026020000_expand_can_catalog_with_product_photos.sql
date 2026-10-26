-- Expand the catalog only with individually identifiable cans that have a matching product photo.
-- Product photos are direct product assets from Coca-Cola France and Freshy Drink Shop.
-- Barcode values are unit-level can EANs, not outer-case barcodes.

insert into public.brands (slug, name, color)
select seed.slug, seed.name, seed.color
from (values
  ('pepsi', 'Pepsi', '#005CB4'),
  ('red-bull', 'Red Bull', '#D71920'),
  ('monster', 'Monster Energy', '#7DBA00'),
  ('fanta', 'Fanta', '#FF7900'),
  ('sprite', 'Sprite', '#00A94F'),
  ('dr-pepper', 'Dr Pepper', '#7B1E2B'),
  ('lipton', 'Lipton Ice Tea', '#F6C800'),
  ('san-pellegrino', 'San Pellegrino', '#008B62')
) as seed(slug, name, color)
where not exists (
  select 1 from public.brands b
  where b.slug = seed.slug or lower(b.name) = lower(seed.name)
);

with photo_cans(barcode, name, brand_slug, flavour, category, image_url, color_primary, color_secondary) as (
  values
    ('5900497030212', 'Pepsi Original 330 ml', 'pepsi', 'Cola', 'Soda'::public.can_category,
      'https://freshy.lu/wp-content/uploads/2025/06/Pepsi-24x33cl-.png', '#005CB4', '#FFFFFF'),
    ('5900497300339', 'Pepsi Max 330 ml', 'pepsi', 'Cola sans sucres', 'Soda'::public.can_category,
      'https://freshy.lu/wp-content/uploads/2025/06/Pepsi-Max-24x33cl-.png', '#101820', '#005CB4'),
    ('9002490205973', 'Red Bull Energy Drink 250 ml', 'red-bull', 'Original', 'Energy Drink'::public.can_category,
      'https://freshy.lu/wp-content/uploads/2025/06/Red-Bull-24x25cl-405x1024.webp', '#003A70', '#D71920'),
    ('5060335632302', 'Monster Energy Original 500 ml', 'monster', 'Original', 'Energy Drink'::public.can_category,
      'https://freshy.lu/wp-content/uploads/2025/06/Monster-Energy-24x50cl.png', '#111111', '#7DBA00'),
    ('5449000214805', 'Fanta Orange 330 ml', 'fanta', 'Orange', 'Soda'::public.can_category,
      'https://www.coca-cola.com/content/dam/onexp/fr/fr/fanta/new/orange.png', '#FF7900', '#005CB4'),
    ('5449000214775', 'Sprite Original 330 ml', 'sprite', 'Citron-citron vert', 'Soda'::public.can_category,
      'https://www.coca-cola.com/content/dam/onexp/fr/fr/sprite/new-sprite.png', '#00A94F', '#F5E500'),
    ('5010102100015', 'Dr Pepper Original 330 ml', 'dr-pepper', '23 saveurs', 'Soda'::public.can_category,
      'https://freshy.lu/wp-content/uploads/2025/06/Dr-Pepper-24x33cl.jpg', '#7B1E2B', '#FFFFFF'),
    ('3168930174431', 'Lipton Ice Tea Pêche 330 ml', 'lipton', 'Pêche', 'Soft Drink'::public.can_category,
      'https://freshy.lu/wp-content/uploads/2025/06/Lipton-Ice-Tea-Peche-24x33cl.png', '#F6C800', '#E66A19'),
    ('8002270996795', 'San Pellegrino Limonata 330 ml', 'san-pellegrino', 'Citron', 'Soft Drink'::public.can_category,
      'https://freshy.lu/wp-content/uploads/2025/06/San-Pellegrino-Limonata-24x33cl.webp', '#008B62', '#F4D84A')
),
resolved as (
  select p.*, b.id as brand_id
  from photo_cans p
  join public.brands b on b.slug = p.brand_slug or lower(b.name) = lower(
    case p.brand_slug
      when 'monster' then 'Monster Energy'
      when 'red-bull' then 'Red Bull'
      when 'san-pellegrino' then 'San Pellegrino'
      when 'dr-pepper' then 'Dr Pepper'
      when 'lipton' then 'Lipton Ice Tea'
      else initcap(p.brand_slug)
    end
  )
)
insert into public.cans
  (barcode, name, brand_id, flavour, category, image_url, color_primary, color_secondary)
select barcode, name, brand_id, flavour, category, image_url, color_primary, color_secondary
from resolved
where not exists (select 1 from public.cans existing where existing.barcode = resolved.barcode);

-- If one of these exact barcodes already exists, ensure it uses the curated product photo.
with photo_cans(barcode, image_url) as (
  values
    ('5900497030212', 'https://freshy.lu/wp-content/uploads/2025/06/Pepsi-24x33cl-.png'),
    ('5900497300339', 'https://freshy.lu/wp-content/uploads/2025/06/Pepsi-Max-24x33cl-.png'),
    ('9002490205973', 'https://freshy.lu/wp-content/uploads/2025/06/Red-Bull-24x25cl-405x1024.webp'),
    ('5060335632302', 'https://freshy.lu/wp-content/uploads/2025/06/Monster-Energy-24x50cl.png'),
    ('5449000214805', 'https://www.coca-cola.com/content/dam/onexp/fr/fr/fanta/new/orange.png'),
    ('5449000214775', 'https://www.coca-cola.com/content/dam/onexp/fr/fr/sprite/new-sprite.png'),
    ('5010102100015', 'https://freshy.lu/wp-content/uploads/2025/06/Dr-Pepper-24x33cl.jpg'),
    ('3168930174431', 'https://freshy.lu/wp-content/uploads/2025/06/Lipton-Ice-Tea-Peche-24x33cl.png'),
    ('8002270996795', 'https://freshy.lu/wp-content/uploads/2025/06/San-Pellegrino-Limonata-24x33cl.webp')
)
update public.cans c
set image_url = p.image_url
from photo_cans p
where c.barcode = p.barcode;
