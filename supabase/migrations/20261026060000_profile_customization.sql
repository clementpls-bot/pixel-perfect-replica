-- Profile customization: username cooldown, avatar uploads, and featured favourite cans.
alter table public.profiles
  add column if not exists username_changed_at timestamptz,
  add column if not exists favorite_can_ids uuid[] not null default '{}'::uuid[];

create or replace function public.guard_profile_customization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  can_id uuid;
begin
  if new.username is distinct from old.username then
    if char_length(trim(new.username)) < 3 or char_length(trim(new.username)) > 24
      or new.username !~ '^[[:alnum:]_.-]+$' then
      raise exception 'Username must be 3–24 characters and use only letters, numbers, dots, dashes or underscores';
    end if;

    if old.username_changed_at is not null
      and old.username_changed_at > now() - interval '7 days' then
      raise exception 'You can change your username once every 7 days';
    end if;

    if exists (
      select 1 from public.profiles p
      where lower(p.username) = lower(trim(new.username)) and p.id <> new.id
    ) then
      raise exception 'This username is already taken';
    end if;

    new.username := trim(new.username);
    new.username_changed_at := now();
  end if;

  if cardinality(new.favorite_can_ids) > 3 then
    raise exception 'You can feature up to 3 favourite cans';
  end if;

  foreach can_id in array new.favorite_can_ids loop
    if not exists (
      select 1 from public.user_cans uc
      where uc.user_id = new.id and uc.can_id = can_id
    ) then
      raise exception 'Only cans in your collection can be featured as favourites';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists guard_profile_customization on public.profiles;
create trigger guard_profile_customization
before update on public.profiles
for each row execute function public.guard_profile_customization();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own profile avatar" on storage.objects;
create policy "Users can upload their own profile avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their own profile avatar" on storage.objects;
create policy "Users can update their own profile avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own profile avatar" on storage.objects;
create policy "Users can delete their own profile avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Profile avatars are publicly readable" on storage.objects;
create policy "Profile avatars are publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'profile-avatars');
