alter table public.brands add column if not exists logo_url text;
alter table public.profiles
  add column if not exists username_changed_at timestamptz,
  add column if not exists favorite_can_ids uuid[] not null default '{}'::uuid[];

create or replace function public.guard_profile_customization()
returns trigger language plpgsql security definer set search_path = '' as $$
declare can_id uuid;
begin
  if new.username is distinct from old.username then
    if char_length(trim(new.username)) < 3 or char_length(trim(new.username)) > 24
      or new.username !~ '^[[:alnum:]_.-]+$' then
      raise exception 'Username must be 3–24 characters and use only letters, numbers, dots, dashes or underscores';
    end if;
    if old.username_changed_at is not null and old.username_changed_at > now() - interval '7 days' then
      raise exception 'You can change your username once every 7 days';
    end if;
    if exists (select 1 from public.profiles p where lower(p.username) = lower(trim(new.username)) and p.id <> new.id) then
      raise exception 'This username is already taken';
    end if;
    new.username := trim(new.username);
    new.username_changed_at := now();
  end if;
  if cardinality(new.favorite_can_ids) > 3 then
    raise exception 'You can feature up to 3 favourite cans';
  end if;
  foreach can_id in array new.favorite_can_ids loop
    if not exists (select 1 from public.user_cans uc where uc.user_id = new.id and uc.can_id = can_id) then
      raise exception 'Only cans in your collection can be featured as favourites';
    end if;
  end loop;
  return new;
end; $$;

drop trigger if exists guard_profile_customization on public.profiles;
create trigger guard_profile_customization before update on public.profiles
for each row execute function public.guard_profile_customization();