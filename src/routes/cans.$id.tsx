import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Heart, Minus, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAdjustCanQuantity, useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/cans/$id")({
  head: () => ({
    meta: [
      { title: "Détail de la canette — Cansdex" },
      { name: "description", content: "Historique, saveur, notes et commentaires de la communauté sur cette canette." },
      { property: "og:title", content: "Détail de la canette — Cansdex" },
      { property: "og:description", content: "Historique, saveur, notes et commentaires de la communauté sur cette canette." },
    ],
  }),
  component: CanPage,
});

type Comment = { id: string; body: string; parent_id: string | null; user_id: string; created_at: string; profiles: { username: string } | null; comment_likes: { user_id: string }[] };

function CanPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  const adjustCanQuantity = useAdjustCanQuantity();
  const qc = useQueryClient();
  const can = data?.cans.find((c) => c.id === id);
  const brand = data?.brands.find((b) => b.id === can?.brand_id);

  const ratings = useQuery({
    queryKey: ["ratings", id],
    queryFn: async () => (await supabase.from("ratings").select("user_id,design,taste").eq("can_id", id)).data ?? [],
  });
  const comments = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => ((await supabase.from("comments").select("id,body,parent_id,user_id,created_at,profiles(username),comment_likes(user_id)").eq("can_id", id).order("created_at")).data ?? []) as Comment[],
  });

  if (!data) return null;
  if (!can) return <p>Canette introuvable.</p>;
  const qty = owned?.get(can.id) ?? 0;
  const avg = (k: "design" | "taste") => {
    const v = (ratings.data ?? []).map((r) => r[k]).filter((x): x is number => x != null);
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "–";
  };
  const mine = ratings.data?.find((r) => r.user_id === user?.id);

  const rate = async (k: "design" | "taste", v: number) => {
    if (!user) { toast("Connecte-toi pour noter cette canette."); return; }
    const { error } = await supabase.from("ratings").upsert({ can_id: id, user_id: user.id, design: k === "design" ? v : mine?.design ?? null, taste: k === "taste" ? v : mine?.taste ?? null, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ratings", id] });
  };

  const changeQty = async (d: 1 | -1) => {
    if (!user) { toast("Connecte-toi pour collectionner."); return; }
    if (qty === 0) {
      toast("Scanne d’abord cette canette avec la caméra pour la débloquer.");
      return;
    }
    try {
      await adjustCanQuantity(can.id, d);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div>
      <Link to="/brands/$slug" params={{ slug: brand?.slug ?? "" }} className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />{brand?.name}</Link>
      <div className="relative mt-4 rounded-3xl border p-8" style={{ background: `radial-gradient(circle at 50% 40%, ${can.color_primary}55, transparent 70%)` }}>
        <div className="mx-auto w-28"><CanArt can={can} brandName={brand?.name} missing={qty === 0} /></div>
        {qty === 0 && <p className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Pas encore collectionnée</p>}
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-primary">{({ "Energy Drink": "Boisson énergisante", Soda: "Soda", "Soft Drink": "Boisson sans alcool", "Limited Edition": "Édition limitée" } as Record<string, string>)[can.category] ?? can.category}</p>
      <h1 className="text-2xl font-black">{can.name}</h1>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        {[["Marque", brand?.name], ["Saveur", can.flavour], ["Année", can.release_year]].map(([l, v]) => (
          <div key={String(l)} className="rounded-xl bg-muted p-2"><p className="text-muted-foreground">{l}</p><p className="font-bold">{v}</p></div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border bg-card p-3">
        <span className="text-sm font-semibold">Dans ta collection</span>
        <div className="flex items-center gap-3">
          <Button size="icon" variant="secondary" className="rounded-full" disabled={qty === 0} aria-label="Diminuer la quantité" onClick={() => void changeQty(-1)}><Minus /></Button>
          <span className="w-6 text-center font-display text-lg font-black tabular-nums">{qty}</span>
          {qty === 0 ? <Link to="/scan"><Button size="icon" className="rounded-full" aria-label="Scanner pour débloquer cette canette"><Plus /></Button></Link> : <Button size="icon" className="rounded-full" aria-label="Augmenter la quantité" onClick={() => void changeQty(1)}><Plus /></Button>}
        </div>
      </div>

      <p className="mt-5 leading-relaxed">{can.description}</p>
      <h2 className="mt-5 text-sm font-bold uppercase tracking-widest text-muted-foreground">Historique</h2>
      <p className="mt-1 leading-relaxed text-muted-foreground">{can.historical_context}</p>

      <section className="mt-8 grid grid-cols-2 gap-3">
        {(["design", "taste"] as const).map((k) => (
          <div key={k} className="rounded-2xl border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{k === "design" ? "Design" : "Goût"}</p>
            <p className="font-display text-3xl font-black">{avg(k)}<span className="text-base text-muted-foreground"> / 5</span></p>
            <div className="mt-2 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => rate(k, n)} aria-label={`Noter ${k === "design" ? "le design" : "le goût"} ${n}`}>
                  <Star className={`h-5 w-5 ${(mine?.[k] ?? 0) >= n ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <Comments canId={id} comments={comments.data ?? []} />
    </div>
  );
}

function Comments({ canId, comments }: { canId: string; comments: Comment[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["comments", canId] });

  const post = async () => {
    if (!user || !body.trim()) return;
    const { error } = await supabase.from("comments").insert({ can_id: canId, user_id: user.id, body: body.trim(), parent_id: replyTo });
    if (error) { toast.error(error.message); return; }
    setBody(""); setReplyTo(null); refresh();
  };
  const like = async (c: Comment) => {
    if (!user) { toast("Connecte-toi pour aimer ce commentaire."); return; }
    const liked = c.comment_likes.some((l) => l.user_id === user.id);
    if (liked) await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id);
    else await supabase.from("comment_likes").insert({ comment_id: c.id, user_id: user.id });
    refresh();
  };

  const Item = ({ c, child }: { c: Comment; child?: boolean }) => (
    <div className={child ? "ml-6 border-l pl-3" : ""}>
      <div className="rounded-2xl bg-card p-3">
        <p className="text-xs font-bold">{c.profiles?.username ?? "collectionneur"} <span className="font-normal text-muted-foreground">· {new Date(c.created_at).toLocaleDateString()}</span></p>
        <p className="mt-1 text-sm">{c.body}</p>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <button onClick={() => like(c)} className="flex items-center gap-1">
            <Heart className={`h-3.5 w-3.5 ${c.comment_likes.some((l) => l.user_id === user?.id) ? "fill-accent text-accent" : ""}`} />{c.comment_likes.length}
          </button>
          {!child && user && <button onClick={() => setReplyTo(c.id)}>Répondre</button>}
        </div>
      </div>
    </div>
  );

  const top = comments.filter((c) => !c.parent_id);
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-bold">Communauté · {comments.length}</h2>
      {user ? (
        <div className="mb-4 space-y-2">
          {replyTo && <p className="text-xs text-muted-foreground">Réponse en cours… <button className="text-primary" onClick={() => setReplyTo(null)}>Annuler</button></p>}
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Partage ton avis sur cette canette…" maxLength={1000} className="rounded-xl" />
          <Button onClick={post} disabled={!body.trim()} className="rounded-xl font-bold">Publier</Button>
        </div>
      ) : (
        <Link to="/auth" className="mb-4 block text-sm text-primary">Connecte-toi pour participer à la conversation</Link>
      )}
      <div className="space-y-2">
        {top.map((c) => (
          <div key={c.id} className="space-y-2">
            <Item c={c} />
            {comments.filter((r) => r.parent_id === c.id).map((r) => <Item key={r.id} c={r} child />)}
          </div>
        ))}
      </div>
    </section>
  );
}
