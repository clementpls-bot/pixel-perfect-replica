-- A user can only register Drinks for a can that is currently on their wall.
-- Clean up any legacy counters left behind after a can was removed.
delete from public.user_can_drinks as drinks
where not exists (
  select 1
  from public.user_cans as owned
  where owned.user_id = drinks.user_id
    and owned.can_id = drinks.can_id
);

create or replace function public.enforce_user_can_drinks_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.user_cans as owned
    where owned.user_id = new.user_id
      and owned.can_id = new.can_id
  ) then
    raise exception 'You must own this can before recording Drinks.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_user_can_drinks_ownership on public.user_can_drinks;
create trigger enforce_user_can_drinks_ownership
before insert or update of user_id, can_id, drinks_count
on public.user_can_drinks
for each row
execute function public.enforce_user_can_drinks_ownership();

-- If the last ownership row for a can is removed, remove its personal Drinks counter too.
create or replace function public.remove_drinks_when_can_is_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.user_cans as owned
    where owned.user_id = old.user_id
      and owned.can_id = old.can_id
  ) then
    delete from public.user_can_drinks as drinks
    where drinks.user_id = old.user_id
      and drinks.can_id = old.can_id;
  end if;

  return old;
end;
$$;

drop trigger if exists remove_drinks_when_can_is_removed on public.user_cans;
create trigger remove_drinks_when_can_is_removed
after delete on public.user_cans
for each row
execute function public.remove_drinks_when_can_is_removed();
