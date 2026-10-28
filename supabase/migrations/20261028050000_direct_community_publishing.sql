-- Publish community comments and photos directly from the signed-in client.
-- Automated moderation is removed; users still need an account and can only post as themselves.

drop trigger if exists enforce_comment_moderation_before_insert on public.comments;
drop function if exists public.enforce_comment_moderation();

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and cmd = 'INSERT'
  loop
    execute format('drop policy if exists %I on public.comments', policy_row.policyname);
  end loop;
end;
$$;

grant insert on public.comments to authenticated;

create policy "Signed-in users can publish their own comments"
  on public.comments
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (nullif(trim(body), '') is not null or image_url is not null)
    and (body is null or char_length(body) <= 1000)
  );

-- The community-posts bucket is already public and limited to image formats and 8 MiB.
-- Keep uploads scoped to the signed-in user's folder.
drop policy if exists "Users can upload their own community photos" on storage.objects;
create policy "Users can upload their own community photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

notify pgrst, 'reload schema';
