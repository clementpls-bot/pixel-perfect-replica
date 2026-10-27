-- Optional beverage facts displayed on can detail pages.
alter table public.cans
  add column if not exists caffeine_mg_per_100ml numeric(7,2),
  add column if not exists sugar_g_per_100ml numeric(7,2),
  add column if not exists taurine_mg_per_100ml numeric(7,2),
  add column if not exists energy_kcal_per_100ml numeric(7,2),
  add column if not exists volume_ml integer;

-- Community reports for correcting catalogue information.
create table if not exists public.can_reports (
  id uuid primary key default gen_random_uuid(),
  can_id uuid not null references public.cans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'Information incorrecte',
  details text not null check (char_length(trim(details)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists can_reports_can_id_created_at_idx
  on public.can_reports (can_id, created_at desc);

grant insert, select on public.can_reports to authenticated;
grant all on public.can_reports to service_role;
alter table public.can_reports enable row level security;

drop policy if exists "Authenticated users can submit can reports" on public.can_reports;
create policy "Authenticated users can submit can reports"
  on public.can_reports for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own can reports" on public.can_reports;
create policy "Users can view their own can reports"
  on public.can_reports for select to authenticated
  using ((select auth.uid()) = user_id);
