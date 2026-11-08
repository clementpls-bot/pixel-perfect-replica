-- Count every successful barcode scan as one additional Drink.
-- The first scan also unlocks the can and creates its first Drink atomically.
create or replace function public.record_can_scan(p_can_id uuid)
returns table (is_new boolean, drinks_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_rows integer := 0;
  total_drinks integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.cans where id = p_can_id) then
    raise exception 'Can not found';
  end if;

  insert into public.user_cans (user_id, can_id, quantity, condition)
  values (current_user_id, p_can_id, 1, 'full')
  on conflict do nothing;

  get diagnostics inserted_rows = row_count;

  insert into public.user_can_drinks (user_id, can_id, drinks_count, updated_at)
  values (current_user_id, p_can_id, 1, now())
  on conflict (user_id, can_id)
  do update set
    drinks_count = public.user_can_drinks.drinks_count + 1,
    updated_at = now()
  returning public.user_can_drinks.drinks_count into total_drinks;

  return query select (inserted_rows > 0), total_drinks;
end;
$$;

revoke all on function public.record_can_scan(uuid) from public, anon;
grant execute on function public.record_can_scan(uuid) to authenticated;

-- Approving an additional barcode also unlocks its can for the contributor.
-- This runs server-side because admins cannot directly write another user's wall.
create or replace function public.approve_can_barcode(p_barcode_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  barcode_entry public.can_barcodes%rowtype;
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Only admins can approve can barcodes';
  end if;

  select * into barcode_entry
  from public.can_barcodes
  where id = p_barcode_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending barcode proposal not found';
  end if;

  update public.can_barcodes
  set status = 'approved'
  where id = barcode_entry.id;

  if barcode_entry.submitted_by is not null then
    insert into public.user_cans (user_id, can_id, quantity, condition)
    values (barcode_entry.submitted_by, barcode_entry.can_id, 1, 'full')
    on conflict do nothing;

    insert into public.user_can_drinks (user_id, can_id, drinks_count, updated_at)
    values (barcode_entry.submitted_by, barcode_entry.can_id, 1, now())
    on conflict (user_id, can_id)
    do update set
      drinks_count = greatest(public.user_can_drinks.drinks_count, 1),
      updated_at = now();
  end if;
end;
$$;

revoke all on function public.approve_can_barcode(uuid) from public, anon;
grant execute on function public.approve_can_barcode(uuid) to authenticated;

notify pgrst, 'reload schema';
