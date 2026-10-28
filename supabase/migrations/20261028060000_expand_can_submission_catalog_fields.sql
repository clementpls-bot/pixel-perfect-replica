-- Keep community proposals capable of carrying the same catalog details as the admin editor.
alter table public.can_submissions
  add column if not exists historical_context text,
  add column if not exists color_primary text,
  add column if not exists color_secondary text,
  add column if not exists caffeine_mg_per_100ml numeric,
  add column if not exists sugar_g_per_100ml numeric,
  add column if not exists taurine_mg_per_100ml numeric,
  add column if not exists energy_kcal_per_100ml numeric,
  add column if not exists history_verified boolean not null default false,
  add column if not exists tab_color text,
  add column if not exists notes text;

notify pgrst, 'reload schema';
