-- Public aggregate: total Drinks recorded by all users for one can.
-- The function exposes only an aggregate count, not individual users' records.
create or replace function public.get_total_can_drinks(p_can_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(sum(d.drinks_count), 0)::bigint
  from public.user_can_drinks as d
  where d.can_id = p_can_id;
$function$;

revoke all on function public.get_total_can_drinks(uuid) from public;
grant execute on function public.get_total_can_drinks(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
