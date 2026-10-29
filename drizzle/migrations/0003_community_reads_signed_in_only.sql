DROP POLICY IF EXISTS "likes public" ON public.comment_likes;
CREATE POLICY "likes readable by members" ON public.comment_likes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "profiles readable by members" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "comments public" ON public.comments;
CREATE POLICY "comments readable by members" ON public.comments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ratings public" ON public.ratings;
CREATE POLICY "ratings readable by members" ON public.ratings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.comment_likes, public.profiles, public.comments, public.ratings FROM anon;