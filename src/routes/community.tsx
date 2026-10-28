import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useOwned } from "@/lib/data";
import { pastelCanColor } from "@/lib/can-colors";

export const Route = createFileRoute("/community")({
  head: () => ({ meta: [
    { title: "Communauté des canettes — Cansdex" },
    { name: "description", content: "Les dernières photos et discussions publiées sur les fiches de canettes Cansdex." },
  ] }),
  component: CommunityFeedPage,
});

type FeedPost = { id: string; user_id: string; can_id: string; body: string | null; image_url: string | null; created_at: string; profiles: { username: string } | null; comment_likes: { user_id: string; vote: number }[] };
type CanRow = { id: string; name: string; image_url: string | null; brand_id: string; color_primary: string };
type BrandRow = { id: string; name: string; logo_url: string | null };

function CommunityFeedPage() {
  const { user } = useAuth();
  const { data: owned } = useOwned();
  const posts = useQuery({
    queryKey: ["community-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.from("comments")
        .select("id,user_id,can_id,body,image_url,parent_id,created_at,profiles(username),comment_likes(user_id,vote)")
        .is("parent_id", null).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      const rows = (data ?? []) as unknown as FeedPost[];
      const canIds = [...new Set(rows.map((row) => row.can_id))];
      if (!canIds.length) return { posts: rows, cans: [] as CanRow[], brands: [] as BrandRow[] };
      const { data: cans, error: cansError } = await supabase.from("cans").select("id,name,image_url,brand_id,color_primary").in("id", canIds);
      if (cansError) throw cansError;
      const brandIds = [...new Set((cans ?? []).map((can) => can.brand_id))];
      const { data: brands, error: brandsError } = brandIds.length
        ? await supabase.from("brands").select("id,name,logo_url").in("id", brandIds)
        : { data: [], error: null };
      if (brandsError) throw brandsError;
      return { posts: rows, cans: (cans ?? []) as CanRow[], brands: (brands ?? []) as BrandRow[] };
    },
  });
  const rows = posts.data;
  const canMap = new Map((rows?.cans ?? []).map((can) => [can.id, can]));
  const brandMap = new Map((rows?.brands ?? []).map((brand) => [brand.id, brand]));

  return <div className="space-y-5">
    <header className="pt-1">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Cansdex · Communauté</p>
      <h1 className="mt-1 text-2xl font-black">Les dernières publications</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Un fil pour découvrir les nouvelles photos et les échanges. Chaque publication appartient à une canette précise : ouvre sa fiche pour participer.</p>
    </header>
    {posts.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Chargement du fil…</p>
      : posts.error ? <p className="rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">Impossible de charger les publications pour le moment.</p>
      : !rows?.posts.length ? <div className="rounded-2xl border border-dashed p-8 text-center"><MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 font-bold">Le fil est encore vide</h2><p className="mt-1 text-sm text-muted-foreground">Les publications apparaîtront ici quand les collectionneurs partageront quelque chose depuis une fiche de canette.</p><Link to="/brands" className="mt-4 inline-flex text-sm font-semibold text-primary">Explorer les marques</Link></div>
      : <div className="space-y-3">{rows.posts.map((post) => {
        const can = canMap.get(post.can_id); if (!can) return null;
        const brand = brandMap.get(can.brand_id);
        const ups = post.comment_likes.filter((vote) => vote.vote !== -1).length;
        const downs = post.comment_likes.filter((vote) => vote.vote === -1).length;
        return <article key={post.id} className="overflow-hidden rounded-2xl border transition hover:border-primary/40 hover:shadow-sm" style={{ backgroundColor: pastelCanColor(can.color_primary) }}>
          <Link to="/cans/$id" params={{ id: post.can_id }} className="flex items-center gap-3 border-b bg-muted/30 p-3 transition hover:bg-muted/50">
            {can.image_url ? <img src={can.image_url} alt="" className="h-11 w-8 rounded-md object-contain" /> : <div className="flex h-11 w-8 items-center justify-center rounded-md bg-muted"><MessageCircle className="h-4 w-4 text-muted-foreground" /></div>}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{can.name}</p><div className="mt-0.5 flex flex-wrap items-center gap-1.5"><p className="truncate text-xs text-muted-foreground">{brand?.name ?? "Marque"} · espace de discussion</p>{user && owned && <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${owned.has(can.id) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{owned.has(can.id) ? "✓ Dans ma collection" : "Pas dans ma collection"}</span>}</div></div>
            <span className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
          </Link>
          {post.body?.trim() && <p className="whitespace-pre-wrap break-words px-4 pt-3 text-sm leading-relaxed">{post.body}</p>}
          {post.image_url && <Link to="/cans/$id" params={{ id: post.can_id }} className="block px-3 pt-3"><img src={post.image_url} alt={`Photo partagée sur ${can.name}`} loading="lazy" className="max-h-80 w-full rounded-xl bg-muted object-contain" /></Link>}
          <div className="flex items-center justify-between gap-3 px-4 py-3"><span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">Par <Link to="/users/$id" params={{ id: post.user_id }} className="truncate font-semibold text-primary hover:underline">{post.profiles?.username ?? "Collectionneur"}</Link></span><div className="flex shrink-0 items-center gap-3"><Link to="/cans/$id" params={{ id: post.can_id }} className="text-xs font-semibold text-primary hover:underline">Ouvrir la fiche</Link><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{ups}</span><span className="inline-flex items-center gap-1"><ThumbsDown className="h-3.5 w-3.5" />{downs}</span></span></div></div>
        </article>;
      })}</div>}
    <p className="pb-2 text-center text-[11px] text-muted-foreground">Les publications se créent uniquement depuis la page d’une canette, jamais depuis ce fil général.</p>
  </div>;
}
