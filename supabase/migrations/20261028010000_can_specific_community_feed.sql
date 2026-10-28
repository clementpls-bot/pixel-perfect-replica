-- Can-specific community: optional photo-only posts and up/down votes.
alter table public.comments add column if not exists image_url text;
alter table public.comments alter column body drop not null;
alter table public.comments drop constraint if exists comments_body_check;
alter table public.comments add constraint comments_body_check
  check (body is null or char_length(trim(body)) between 1 and 1000);
alter table public.comments drop constraint if exists comments_body_or_image_check;
alter table public.comments add constraint comments_body_or_image_check
  check (nullif(trim(body), '') is not null or image_url is not null);

alter table public.comment_likes add column if not exists vote smallint not null default 1;
alter table public.comment_likes drop constraint if exists comment_likes_vote_check;
alter table public.comment_likes add constraint comment_likes_vote_check check (vote in (-1, 1));
grant update on public.comment_likes to authenticated;
drop policy if exists "own vote update" on public.comment_likes;
create policy "own vote update" on public.comment_likes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists comments_created_at_desc_idx on public.comments (created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-posts', 'community-posts', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own community photos" on storage.objects;
create policy "Users can upload their own community photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'community-posts' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can delete their own community photos" on storage.objects;
create policy "Users can delete their own community photos" on storage.objects for delete to authenticated
  using (bucket_id = 'community-posts' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Existing comment_likes rows become upvotes; the can_id on every post remains mandatory.
notify pgrst, 'reload schema';
