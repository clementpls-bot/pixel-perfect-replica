-- Public profile statistics are visible to visitors, so the public profile can show
-- ownership and Drinks totals. These tables contain only collection records.
drop policy if exists "Public can view collection ownership" on public.user_cans;
create policy "Public can view collection ownership"
  on public.user_cans for select to anon, authenticated using (true);

drop policy if exists "Public can view Drinks totals" on public.user_can_drinks;
create policy "Public can view Drinks totals"
  on public.user_can_drinks for select to anon, authenticated using (true);

-- Remove the two brands and their catalog entries. User collection rows referencing
-- these cans are expected to follow the foreign-key deletion rules configured by the app.
delete from public.cans
where brand_id in (
  select id from public.brands
  where lower(trim(name)) in ('bang', 'bang energy', 'ciao energy', 'ciao')
);

delete from public.can_models
where brand_id in (
  select id from public.brands
  where lower(trim(name)) in ('bang', 'bang energy', 'ciao energy', 'ciao')
);

delete from public.brands
where lower(trim(name)) in ('bang', 'bang energy', 'ciao energy', 'ciao');
