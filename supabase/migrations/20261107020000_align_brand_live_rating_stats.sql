-- Keep public brand-page statistics identical to the separate Design and Taste
-- averages shown on each can detail page. The previous RPC mixed both scores.
drop function if exists public.get_brand_can_stats(uuid);

create function public.get_brand_can_stats(p_brand_id uuid)
returns table (
  can_id uuid,
  total_drinks bigint,
  average_design numeric,
  design_rating_count bigint,
  average_taste numeric,
  taste_rating_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as can_id,
    coalesce(drinks.total_drinks, 0)::bigint as total_drinks,
    ratings.average_design,
    coalesce(ratings.design_rating_count, 0)::bigint as design_rating_count,
    ratings.average_taste,
    coalesce(ratings.taste_rating_count, 0)::bigint as taste_rating_count
  from public.cans c
  left join lateral (
    select coalesce(sum(ucd.drinks_count), 0)::bigint as total_drinks
    from public.user_can_drinks ucd
    where ucd.can_id = c.id
  ) drinks on true
  left join lateral (
    select
      avg(r.design)::numeric as average_design,
      count(r.design)::bigint as design_rating_count,
      avg(r.taste)::numeric as average_taste,
      count(r.taste)::bigint as taste_rating_count
    from public.ratings r
    where r.can_id = c.id
  ) ratings on true
  where c.brand_id = p_brand_id;
$$;

grant execute on function public.get_brand_can_stats(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
