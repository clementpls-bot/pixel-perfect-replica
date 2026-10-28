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

-- Defense in depth: clients cannot bypass the moderation endpoint by inserting directly.
create or replace function public.enforce_comment_moderation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Community posts must be submitted through the moderation service'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists enforce_comment_moderation_before_insert on public.comments;
create trigger enforce_comment_moderation_before_insert
before insert on public.comments
for each row execute function public.enforce_comment_moderation();

notify pgrst, 'reload schema';
