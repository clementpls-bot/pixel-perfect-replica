-- Merge duplicate brand rows with the same name (case/spacing/accents-insensitive).
-- Prefer the row that already has a logo, then the oldest stable record.
with ranked as (
  select
    b.id,
    first_value(b.id) over (
      partition by lower(regexp_replace(trim(b.name), '\\s+', ' ', 'g'))
      order by
        (coalesce(to_jsonb(b)->>'logo_url', '') <> '') desc,
        b.created_at asc,
        b.id asc
    ) as canonical_id
  from public.brands b
)
update public.cans c
set brand_id = ranked.canonical_id
from ranked
where c.brand_id = ranked.id
  and ranked.id <> ranked.canonical_id;

with ranked as (
  select
    b.id,
    first_value(b.id) over (
      partition by lower(regexp_replace(trim(b.name), '\\s+', ' ', 'g'))
      order by
        (coalesce(to_jsonb(b)->>'logo_url', '') <> '') desc,
        b.created_at asc,
        b.id asc
    ) as canonical_id
  from public.brands b
)
delete from public.brands b
using ranked
where b.id = ranked.id
  and ranked.id <> ranked.canonical_id;
