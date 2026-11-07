-- Statistiques publiques agrégées par canette pour les pages de marque.
-- SECURITY DEFINER permet de compter les Drinks de toute la communauté,
-- même lorsque la table user_can_drinks est protégée par RLS.
create or replace function public.get_brand_can_stats(p_brand_id uuid)
returns table (
  can_id uuid,
  total_drinks bigint,
  average_rating numeric,
  rating_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as can_id,
    coalesce(drinks.total_drinks, 0)::bigint as total_drinks,
    ratings.average_rating,
    coalesce(ratings.rating_count, 0)::bigint as rating_count
  from public.cans c
  left join lateral (
    select coalesce(sum(ucd.drinks_count), 0)::bigint as total_drinks
    from public.user_can_drinks ucd
    where ucd.can_id = c.id
  ) drinks on true
  left join lateral (
    select
      avg(score)::numeric as average_rating,
      count(score)::bigint as rating_count
    from public.ratings r
    cross join lateral (values
      (r.design::numeric),
      (r.taste::numeric)
    ) as scores(score)
    where r.can_id = c.id
      and scores.score is not null
  ) ratings on true
  where c.brand_id = p_brand_id;
$$;

grant execute on function public.get_brand_can_stats(uuid) to anon, authenticated;
