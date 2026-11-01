-- Public popularity counts are aggregate-only: individual collection records stay private.
create or replace function public.get_can_popularity_counts(p_can_ids uuid[])
returns table (can_id uuid, collector_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select uc.can_id, count(distinct uc.user_id)::bigint as collector_count
  from public.user_cans uc
  where uc.can_id = any(coalesce(p_can_ids, '{}'::uuid[]))
  group by uc.can_id;
$$;

revoke all on function public.get_can_popularity_counts(uuid[]) from public;
grant execute on function public.get_can_popularity_counts(uuid[]) to anon, authenticated;

-- A root community post may be general (no can_id); replies remain can-specific.
alter table public.comments alter column can_id drop not null;

drop policy if exists "Authenticated users can create general community posts" on public.comments;
create policy "Authenticated users can create general community posts"
  on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and can_id is null
    and parent_id is null
  );

drop policy if exists "Anyone can read general community posts" on public.comments;
create policy "Anyone can read general community posts"
  on public.comments for select to anon, authenticated
  using (can_id is null and parent_id is null);

create index if not exists comments_general_feed_idx
  on public.comments (created_at desc)
  where can_id is null and parent_id is null;

notify pgrst, 'reload schema';
