-- Restore the can catalogue foundation before migrations that reference can_models.
-- This migration is deliberately idempotent and preserves all existing can and collection rows.

begin;

-- The app and later Supabase migrations depend on this table. It was previously
-- created only by a Drizzle migration, which is not part of Supabase's migration chain.
create table if not exists public.can_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  slug text not null,
  name text not null,
  flavour text,
  description text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  constraint can_models_brand_slug_key unique (brand_id, slug)
);

alter table public.can_models enable row level security;
revoke all on public.can_models from public;
grant select on public.can_models to anon, authenticated;
grant insert, update on public.can_models to authenticated;
grant all on public.can_models to service_role;

drop policy if exists "can_models public read" on public.can_models;
create policy "can_models public read"
  on public.can_models for select
  using (true);

drop policy if exists "Admins manage can models" on public.can_models;
create policy "Admins manage can models"
  on public.can_models for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Keep the concrete can table aligned with the model/variant fields used by
-- the current application and by approve_can_submission().
alter table public.cans
  add column if not exists model_id uuid references public.can_models(id) on delete set null,
  add column if not exists variant_name text not null default 'Standard',
  add column if not exists region text,
  add column if not exists edition_type text not null default 'standard',
  add column if not exists tab_color text,
  add column if not exists notes text;

alter table public.cans
  alter column variant_name set default 'Standard',
  alter column edition_type set default 'standard';

alter table public.cans
  drop constraint if exists cans_edition_type_check;
alter table public.cans
  add constraint cans_edition_type_check
  check (edition_type in ('standard', 'limited', 'collab', 'import', 'redesign'))
  not valid;
alter table public.cans validate constraint cans_edition_type_check;

create index if not exists cans_model_id_idx on public.cans(model_id);

-- Seed missing models from existing catalogue entries without overwriting
-- manually curated models or changing any can IDs/barcodes.
insert into public.can_models (brand_id, slug, name, flavour, description, cover_image_url)
select distinct on (c.brand_id, normalized.slug)
  c.brand_id,
  coalesce(nullif(normalized.slug, ''), 'can-' || left(c.id::text, 8)),
  c.name,
  c.flavour,
  c.description,
  c.image_url
from public.cans as c
cross join lateral (
  select trim(both '-' from regexp_replace(lower(c.name), '[^a-z0-9]+', '-', 'g')) as slug
) as normalized
order by c.brand_id, normalized.slug, c.created_at nulls last, c.id
on conflict (brand_id, slug) do nothing;

update public.cans as c
set model_id = model.id
from public.can_models as model
where c.model_id is null
  and model.brand_id = c.brand_id
  and model.slug = coalesce(
    nullif(trim(both '-' from regexp_replace(lower(c.name), '[^a-z0-9]+', '-', 'g')), ''),
    'can-' || left(c.id::text, 8)
  );

-- The collection UI stores one row per can and condition. The former
-- (user_id, can_id) uniqueness constraint prevented that feature from working.
alter table public.user_cans
  add column if not exists condition text not null default 'full';

alter table public.user_cans
  drop constraint if exists user_cans_condition_check;
alter table public.user_cans
  add constraint user_cans_condition_check
  check (condition in ('full', 'empty', 'empty_bottom_opened'))
  not valid;
alter table public.user_cans validate constraint user_cans_condition_check;

alter table public.user_cans
  drop constraint if exists user_cans_user_id_can_id_key;

create unique index if not exists user_cans_user_can_condition_key
  on public.user_cans(user_id, can_id, condition);

notify pgrst, 'reload schema';

commit;
