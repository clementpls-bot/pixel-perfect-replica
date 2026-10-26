-- Curated product photos and additional individually identifiable American soda cans.
-- Product-specific image URLs are direct images from My American Shop / American Uncle.
-- The UPC/EAN is for the individual can, not a multipack.

insert into public.brands (slug, name, color)
select 'dr-pepper', 'Dr Pepper', '#7B1E2B'
where not exists (
  select 1 from public.brands
  where slug = 'dr-pepper' or lower(name) = 'dr pepper'
);

with photo_cans(barcode, name, flavour, category, image_url, color_primary, color_secondary) as (
  values
    ('8435185954626', 'Dr Pepper Cherry 355 ml', 'Cerise', 'Soda'::public.can_category,
      'https://www.myamericanshop.com/cdn/shop/files/dr-pepper-cherry-8435185954626-1166437794.png?format=webp&v=1784217911&width=3840',
      '#7B1E2B', '#FFFFFF'),
    ('5902860417781', 'Dr Pepper Slim Can Vanilla 330 ml', 'Vanille', 'Soda'::public.can_category,
      'https://www.myamericanshop.com/cdn/shop/files/dr-pepper-slim-can-vanilla-5902860417781-1158723684.png?v=1745499932&width=1000',
      '#7B1E2B', '#E8D7B7'),
    ('078000037692', 'Dr Pepper Strawberries & Cream 355 ml', 'Fraise et crème', 'Soda'::public.can_category,
      'https://americanuncleshop.fr/cdn/shop/products/dr-pepper-straw-cream-355ml.jpg?v=1680168382',
      '#7B1E2B', '#F2A7B8')
),
resolved as (
  select p.*, b.id as brand_id
  from photo_cans p
  join public.brands b
    on b.slug = 'dr-pepper' or lower(b.name) = 'dr pepper'
)
insert into public.cans
  (barcode, name, brand_id, flavour, category, image_url, color_primary, color_secondary)
select barcode, name, brand_id, flavour, category, image_url, color_primary, color_secondary
from resolved
where not exists (
  select 1 from public.cans existing where existing.barcode = resolved.barcode
);

-- Refresh the product-specific photos when these exact can barcodes already exist.
with photo_cans(barcode, image_url) as (
  values
    ('8435185954626', 'https://www.myamericanshop.com/cdn/shop/files/dr-pepper-cherry-8435185954626-1166437794.png?format=webp&v=1784217911&width=3840'),
    ('5902860417781', 'https://www.myamericanshop.com/cdn/shop/files/dr-pepper-slim-can-vanilla-5902860417781-1158723684.png?v=1745499932&width=1000'),
    ('078000037692', 'https://americanuncleshop.fr/cdn/shop/products/dr-pepper-straw-cream-355ml.jpg?v=1680168382')
)
update public.cans c
set image_url = p.image_url
from photo_cans p
where c.barcode = p.barcode;
