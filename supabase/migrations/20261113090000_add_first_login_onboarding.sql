-- First-login product tour: only accounts that exist before this migration are
-- considered already onboarded. New accounts get the guided introduction.
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

update public.profiles
set onboarding_completed = true
where onboarding_completed = false;
