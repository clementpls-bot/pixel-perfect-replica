CREATE INDEX IF NOT EXISTS user_cans_can_id_idx ON public.user_cans (can_id);
CREATE INDEX IF NOT EXISTS comments_can_id_created_idx ON public.comments (can_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON public.comment_likes (comment_id);