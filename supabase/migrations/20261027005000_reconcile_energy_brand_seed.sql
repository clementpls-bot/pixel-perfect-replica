-- Reconcile the energy-brand seed after resolving the duplicate 20261027000000 migration version.
-- Intentionally idempotent: safe whether the original migration ran or was skipped.

-- Add brand logos and requested energy-drink brands to the catalogue.
alter table public.brands
  add column if not exists logo_url text;

update public.brands
set logo_url = case slug
  when 'c4' then 'https://www.google.com/s2/favicons?domain=c4energy.com&sz=128'
  when 'prime' then 'https://www.google.com/s2/favicons?domain=drinkprime.com&sz=128'
  when 'ciao-energy' then 'https://www.google.com/s2/favicons?domain=ciaoenergy.com&sz=128'
  when 'ghost' then 'https://www.google.com/s2/favicons?domain=ghostlifestyle.com&sz=128'
  when 'celsius' then 'https://www.google.com/s2/favicons?domain=celsius.com&sz=128'
  when 'bang-energy' then 'https://www.google.com/s2/favicons?domain=bangenergy.com&sz=128'
  else logo_url
end
where slug in ('c4', 'prime', 'ciao-energy', 'ghost', 'celsius', 'bang-energy');

insert into public.brands (slug, name, color, logo_url)
select seed.slug, seed.name, seed.color, seed.logo_url
from (values
  ('c4', 'C4', '#F15A24', 'https://www.google.com/s2/favicons?domain=c4energy.com&sz=128'),
  ('prime', 'PRIME', '#4A9B68', 'https://www.google.com/s2/favicons?domain=drinkprime.com&sz=128'),
  ('ciao-energy', 'Ciao Energy', '#E85D75', 'https://www.google.com/s2/favicons?domain=ciaoenergy.com&sz=128'),
  ('ghost', 'Ghost', '#B9FF00', 'https://www.google.com/s2/favicons?domain=ghostlifestyle.com&sz=128'),
  ('celsius', 'Celsius', '#D71920', 'https://www.google.com/s2/favicons?domain=celsius.com&sz=128'),
  ('bang-energy', 'Bang Energy', '#7A3DB8', 'https://www.google.com/s2/favicons?domain=bangenergy.com&sz=128')
) as seed(slug, name, color, logo_url)
where not exists (
  select 1 from public.brands b
  where b.slug = seed.slug or lower(b.name) = lower(seed.name)
);
