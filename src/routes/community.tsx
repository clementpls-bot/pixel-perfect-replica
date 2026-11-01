import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Crown, Flame, MessageCircle, Sparkles, Target, ThumbsDown, ThumbsUp, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCatalog, useOwned } from "@/lib/data";
import { pastelCanColor } from "@/lib/can-colors";
import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";

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

  const [tab, setTab] = useState<"feed" | "ranking" | "quests">("feed");
  const { data: catalog } = useCatalog();
  const allPosts = rows?.posts ?? [];
  const scores = new Map<string, { id: string; name: string; posts: number; likes: number; points: number }>();
  for (const p of allPosts) {
    const e = scores.get(p.user_id) ?? { id: p.user_id, name: p.profiles?.username ?? "Collectionneur", posts: 0, likes: 0, points: 0 };
    e.posts += 1; e.likes += p.comment_likes.filter((v) => v.vote !== -1).length;
    e.points = e.posts * 10 + e.likes * 5 + (p.image_url ? 0 : 0);
    if (p.image_url) e.points += 5;
    scores.set(p.user_id, e);
  }
  const ranking = [...scores.values()].sort((a, b) => b.points - a.points);
  const cans = catalog?.cans ?? [];
  const day = Math.floor(Date.now() / 86400000);
  const canOfDay = cans.length ? cans[day % cans.length] : null;
  const weekAgo = Date.now() - 7 * 86400000;
  const myPostsWeek = allPosts.filter((p) => p.user_id === user?.id && new Date(p.created_at).getTime() > weekAgo);
  const ownedCount = owned?.size ?? 0;
  const quests = [
    { label: "Publie 3 messages cette semaine", cur: myPostsWeek.length, goal: 3, xp: 50 },
    { label: "Partage une photo de canette", cur: myPostsWeek.filter((p) => p.image_url).length, goal: 1, xp: 30 },
    { label: "Possède 10 canettes", cur: ownedCount, goal: 10, xp: 100 },
    { label: "Possède 50 canettes", cur: ownedCount, goal: 50, xp: 300 },
    { label: "Possède la canette du jour", cur: canOfDay && owned?.has(canOfDay.id) ? 1 : 0, goal: 1, xp: 40 },
  ];
  // XP comes only from cans added to your wall: 10 XP per distinct can owned.
  const myXp = ownedCount * 10;
  const level = Math.floor(Math.sqrt(myXp / 50)) + 1;
  const lvlStart = (level - 1) ** 2 * 50, lvlEnd = level ** 2 * 50;
  const titles = ["Novice", "Curieux", "Chasseur", "Collectionneur", "Expert", "Maître", "Légende"];
  const title = titles[Math.min(titles.length - 1, Math.floor((level - 1) / 2))];
  const myRank = ranking.findIndex((r) => r.id === user?.id) + 1;

  const header = <div className="space-y-4">
    {user && <div className="community-xp p-4">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Niveau {level}</p><p className="text-lg font-black">{title}</p></div>
      <div className="text-right"><p className="text-2xl font-black">{myXp} XP</p>{myRank > 0 && <p className="text-xs text-muted-foreground">#{myRank} du classement</p>}</div></div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, ((myXp - lvlStart) / (lvlEnd - lvlStart)) * 100)}%` }} /></div>
      <p className="mt-1 text-[11px] text-muted-foreground">{lvlEnd - myXp} XP avant le niveau {level + 1}</p>
    </div>}
    {canOfDay && <Link to="/cans/$id" params={{ id: canOfDay.id }} className="community-day flex items-center gap-3 rounded-lg border-2 border-foreground p-3 transition hover:-translate-y-0.5">
      {canOfDay.image_url ? <img src={canOfDay.image_url} alt="" className="h-16 w-10 object-contain" /> : <div className="h-16 w-10 rounded-md bg-muted" />}
      <div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-[10px] font-bold uppercase text-foreground"><Sparkles className="h-3 w-3" />Canette du jour</p><p className="truncate font-bold">{canOfDay.name}</p><p className="text-xs text-muted-foreground">{owned?.has(canOfDay.id) ? "✓ Sur ton mur !" : "La trouvaille du jour"}</p></div>
    </Link>}
    <div role="tablist" aria-label="Communauté" className="community-tabs grid grid-cols-3 gap-1 p-1">
      {([["feed", "Fil", MessageCircle], ["ranking", "Classement", Trophy], ["quests", "Défis", Target]] as const).map(([k, l, I]) => <Button variant="ghost" role="tab" aria-selected={tab === k} key={k} onClick={() => setTab(k)} className={`min-w-0 gap-1 rounded px-1 py-2 text-xs ${tab === k ? "community-tab-selected border" : "text-muted-foreground"}`}><I className="h-3.5 w-3.5" />{l}</Button>)}
    </div>
  </div>;

  if (tab === "ranking") return <div className="space-y-5"><PageHeading title="Le classement" eyebrow="La communauté" />{header}
    <div className="flex items-end justify-center gap-2 pt-2">{[1, 0, 2].map((i) => { const r = ranking[i]; if (!r) return <div key={i} className="w-24" />; const h = ["h-28", "h-20", "h-14"][i];
      return <Link key={r.id} to="/users/$id" params={{ id: r.id }} className="flex w-24 flex-col items-center gap-1">{i === 0 && <Crown className="h-5 w-5 text-foreground" />}<span className="brand-medallion flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-card text-lg font-black">{r.name[0]?.toUpperCase()}</span><span className="w-full truncate text-center text-xs font-bold">{r.name}</span><div className={`${h} community-podium flex w-full items-start justify-center rounded-t-lg border-2 border-foreground pt-2 font-display text-2xl text-foreground`}>{i + 1}</div></Link>; })}</div>
    <ol className="space-y-2">{ranking.map((r, i) => <li key={r.id}><Link to="/users/$id" params={{ id: r.id }} className={`flex items-center gap-3 rounded-2xl border bg-card p-3 ${r.id === user?.id ? "border-primary" : ""}`}><span className="w-6 text-center font-black text-muted-foreground">{i + 1}</span><span className="flex-1 truncate font-semibold">{r.name}</span><span className="text-xs text-muted-foreground">{r.posts} posts · {r.likes} 👍</span><span className="font-black">{r.points}</span></Link></li>)}</ol>
    {!ranking.length && <p className="py-8 text-center text-sm text-muted-foreground">Personne au classement pour l'instant — publie le premier message !</p>}
    <p className="text-center text-[11px] text-muted-foreground">Points : 10 par publication, +5 avec photo, +5 par 👍 reçu.</p>
  </div>;

  if (tab === "quests") return <div className="space-y-5"><PageHeading title="Les défis" eyebrow="Objectifs de collection" />{header}
    {!user ? <p className="text-center text-sm text-muted-foreground">Connecte-toi pour suivre tes défis.</p> :
    <div className="space-y-2">{quests.map((q) => { const done = q.cur >= q.goal; return <div key={q.label} className={`rounded-2xl border p-3 ${done ? "border-success bg-success/10" : "bg-card"}`}>
      <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-semibold">{done ? "✅" : <Flame className="h-4 w-4 shrink-0 text-pop-coral" />}{q.label}</p><span className="shrink-0 rounded border border-foreground bg-card px-2 py-0.5 text-[10px] font-bold">{done ? "Réussi" : "En cours"}</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${done ? "bg-success" : "bg-primary"}`} style={{ width: `${Math.min(100, (q.cur / q.goal) * 100)}%` }} /></div>
      <p className="mt-1 text-right text-[11px] text-muted-foreground">{Math.min(q.cur, q.goal)} / {q.goal}</p></div>; })}</div>}
  </div>;

  return <div className="space-y-5">
    <PageHeading title="La communauté" eyebrow="Trouvailles & collectionneurs" />
    {header}
    {posts.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Chargement du fil…</p>
      : posts.error ? <p className="rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">Impossible de charger les publications pour le moment.</p>
      : !rows?.posts.length ? <div className="rounded-2xl border border-dashed p-8 text-center"><MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 font-bold">Le fil est encore vide</h2><p className="mt-1 text-sm text-muted-foreground">Les publications apparaîtront ici quand les collectionneurs partageront quelque chose depuis une fiche de canette.</p><Link to="/brands" className="mt-4 inline-flex text-sm font-semibold text-primary">Explorer les marques</Link></div>
      : <div className="grid items-start gap-4 xl:grid-cols-2">{rows.posts.map((post) => {
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
  </div>;
}
