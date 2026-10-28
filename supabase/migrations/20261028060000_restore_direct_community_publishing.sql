-- Restore direct community publishing from the app.
-- The moderation trigger added in 20261028040000 blocks every client-side insert,
-- even when the user is authenticated and has valid table permissions.
drop trigger if exists enforce_comment_moderation_before_insert on public.comments;
drop function if exists public.enforce_comment_moderation();

notify pgrst, 'reload schema';
