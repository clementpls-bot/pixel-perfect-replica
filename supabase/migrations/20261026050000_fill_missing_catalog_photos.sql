-- Fill the 14 catalog entries reported without photos.
-- Images are looked up by each can's exact barcode on Open Food Facts.
-- Keep the existing can IDs and all user collection relations unchanged.

with photo_map(barcode, image_url) as (
  values
    ('5449000165862', 'https://images.openfoodfacts.org/images/products/544/900/016/5862/front.400.jpg'),
    ('5449000188489', 'https://images.openfoodfacts.org/images/products/544/900/018/8489/front.400.jpg'),
    ('5449000236623', 'https://images.openfoodfacts.org/images/products/544/900/023/6623/front.400.jpg'),
    ('5449000000996', 'https://images.openfoodfacts.org/images/products/544/900/000/0996/front.400.jpg'),
    ('5449000131805', 'https://images.openfoodfacts.org/images/products/544/900/013/1805/front.400.jpg'),
    ('5449000214911', 'https://images.openfoodfacts.org/images/products/544/900/021/4911/front.400.jpg'),
    ('5000112611861', 'https://images.openfoodfacts.org/images/products/500/011/261/1861/front.400.jpg'),
    ('4060800300027', 'https://images.openfoodfacts.org/images/products/406/080/030/0027/front.400.jpg'),
    ('4060800001580', 'https://images.openfoodfacts.org/images/products/406/080/000/1580/front.400.jpg'),
    ('4060800165817', 'https://images.openfoodfacts.org/images/products/406/080/016/5817/front.400.jpg'),
    ('4060800100245', 'https://images.openfoodfacts.org/images/products/406/080/010/0245/front.400.jpg'),
    ('0818094005777', 'https://images.openfoodfacts.org/images/products/081/809/400/5777/front.400.jpg'),
    ('0818094005807', 'https://images.openfoodfacts.org/images/products/081/809/400/5807/front.400.jpg'),
    ('0818094006576', 'https://images.openfoodfacts.org/images/products/081/809/400/6576/front.400.jpg')
)
update public.cans as c
set image_url = p.image_url
from photo_map as p
where c.barcode = p.barcode
  and (c.image_url is null or btrim(c.image_url) = '');
