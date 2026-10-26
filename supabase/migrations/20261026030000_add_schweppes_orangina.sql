-- Add more well-known soft-drink cans only when a product-specific image and unit barcode are available.
insert into public.brands (slug, name, color)
select seed.slug, seed.name, seed.color
from (values
  ('schweppes', 'Schweppes', '#F2C400'),
  ('orangina', 'Orangina', '#F58220')
) as seed(slug, name, color)
where not exists (
  select 1 from public.brands b
  where b.slug = seed.slug or lower(b.name) = lower(seed.name)
);

with photo_cans(barcode, name, brand_name, flavour, category, image_url, color_primary, color_secondary) as (
  values
    ('3124480182630', 'Schweppes Agrumes 330 ml', 'Schweppes', 'Quatre agrumes', 'Soda'::public.can_category,
      'https://freshy.lu/wp-content/uploads/2025/06/Schweppes-Agrumes-24x33cl.jpg', '#F2C400', '#183A72'),
    ('3124480184344', 'Orangina Original 330 ml', 'Orangina', 'Orange', 'Soft Drink'::public.can_category,
      'https://americanuncleshop.fr/cdn/shop/products/orangina-original-330ml_1.jpg?v=1680509919', '#F58220', '#FFFFFF')
),
resolved as (
  select p.*, b.id as brand_id
  from photo_cans p
  join public.brands b on lower(b.name) = lower(p.brand_name)
)
insert into public.cans
  (barcode, name, brand_id, flavour, category, image_url, color_primary, color_secondary)
select barcode, name, brand_id, flavour, category, image_url, color_primary, color_secondary
from resolved
where not exists (select 1 from public.cans existing where existing.barcode = resolved.barcode);

with photo_cans(barcode, image_url) as (
  values
    ('3124480182630', 'https://freshy.lu/wp-content/uploads/2025/06/Schweppes-Agrumes-24x33cl.jpg'),
    ('3124480184344', 'https://americanuncleshop.fr/cdn/shop/products/orangina-original-330ml_1.jpg?v=1680509919')
)
update public.cans c
set image_url = p.image_url
from photo_cans p
where c.barcode = p.barcode;
