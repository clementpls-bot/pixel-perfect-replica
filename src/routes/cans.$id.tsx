import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, Droplets, FlaskConical, Heart, Minus, Plus, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAdjustCanQuantity, useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("name");
  const [reportValue, setReportValue] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [reporting, setReporting] = useState(false);
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
  const ratingSummary = (k: "design" | "taste") => {
    const values = (ratings.data ?? []).map((r) => r[k]).filter((x): x is number => x != null);
    return {
      average: values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "–",
      count: values.length,
    };
  };
  const designSummary = ratingSummary("design");
  const tasteSummary = ratingSummary("taste");
  const mine = ratings.data?.find((r) => r.user_id === user?.id);

  const rate = async (k: "design" | "taste", v: number) => {
    if (!user) { toast("Connecte-toi pour noter cette canette."); return; }
    if (k === "taste" && qty === 0) {
      toast("Ajoute d’abord cette canette à ta collection pour noter son goût.");
      return;
    }
    const { error } = await supabase.from("ratings").upsert({ can_id: id, user_id: user.id, design: k === "design" ? v : mine?.design ?? null, taste: k === "taste" ? v : mine?.taste ?? null, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ratings", id] });
  };

  const submitReport = async () => {
    if (!user) { toast("Connecte-toi pour contribuer."); return; }
    if (!reportDetails.trim()) { toast.error("Ajoute un commentaire pour expliquer la modification."); return; }
    if (!reportValue.trim() && reportCategory !== "image_url") { toast.error("Indique l’information que tu proposes."); return; }
    if (reportCategory === "image_url" && !reportValue.trim() && reportImages.length === 0) { toast.error("Ajoute au moins une image ou une URL de photo."); return; }
    setReporting(true);
    try {
      const imageUrls: string[] = [];
      for (const file of reportImages) {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("can-reports").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (uploadError) throw uploadError;
        imageUrls.push(supabase.storage.from("can-reports").getPublicUrl(path).data.publicUrl);
      }
      const { error } = await supabase.from("can_reports").insert({
        can_id: can.id,
        user_id: user.id,
        category: "Information incorrecte",
        details: reportDetails.trim(),
        proposed_field: reportCategory,
        proposed_value: reportValue.trim() || null,
        image_urls: imageUrls,
      });
      if (error) throw error;
      toast.success("Merci ! Ta proposition a été envoyée pour vérification.");
      setReportDetails(""); setReportValue(""); setReportImages([]); setReportCategory("name"); setReportOpen(false);
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’envoyer la proposition. Réessaie plus tard.");
    } finally {
      setReporting(false);
    }
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
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Design : <strong className="text-foreground">{designSummary.average}/5</strong>{designSummary.count > 0 ? ` · ${designSummary.count} avis` : " · aucun avis"}</span>
        <span>Goût : <strong className="text-foreground">{tasteSummary.average}/5</strong>{tasteSummary.count > 0 ? ` · ${tasteSummary.count} avis` : " · aucun avis"}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {brand?.name && <span>{brand.name}</span>}
        {brand?.name && can.flavour && <span aria-hidden="true">·</span>}
        {can.flavour && <span>{can.flavour}</span>}
        {(brand?.name || can.flavour) && can.release_year && <span aria-hidden="true">·</span>}
        {can.release_year && <span>{can.release_year}</span>}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border bg-card p-3">
        <span className="text-sm font-semibold">Dans ta collection</span>
        <div className="flex items-center gap-3">
          <Button size="icon" variant="secondary" className="rounded-full" disabled={qty === 0} aria-label="Diminuer la quantité" onClick={() => void changeQty(-1)}><Minus /></Button>
          <span className="w-6 text-center font-display text-lg font-black tabular-nums">{qty}</span>
          {qty === 0 ? <Link to="/scan"><Button size="icon" className="rounded-full" aria-label="Scanner pour débloquer cette canette"><Plus /></Button></Link> : <Button size="icon" className="rounded-full" aria-label="Augmenter la quantité" onClick={() => void changeQty(1)}><Plus /></Button>}
        </div>
      </div>

      {can.description?.trim() && <p className="mt-5 leading-relaxed">{can.description}</p>}

      {(can.caffeine_mg_per_100ml != null || can.sugar_g_per_100ml != null || can.taurine_mg_per_100ml != null || can.energy_kcal_per_100ml != null || can.volume_ml != null) && (
        <section className="mt-6 rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Le profil de la boisson</h2>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Données / 100 ml</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {can.caffeine_mg_per_100ml != null && <div className="rounded-xl bg-muted/60 p-3">
              <div className="flex items-center gap-2 text-muted-foreground"><Zap className="h-4 w-4 text-primary" /><span className="text-xs">Caféine</span></div>
              <p className="mt-1 text-xl font-black tabular-nums">{can.caffeine_mg_per_100ml}<span className="ml-1 text-xs font-medium text-muted-foreground">mg</span></p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Number(can.caffeine_mg_per_100ml) / 32 * 100)}%` }} /></div>
            </div>}
            {can.sugar_g_per_100ml != null && <div className="rounded-xl bg-muted/60 p-3">
              <div className="flex items-center gap-2 text-muted-foreground"><Droplets className="h-4 w-4 text-primary" /><span className="text-xs">Sucres</span></div>
              <p className="mt-1 text-xl font-black tabular-nums">{can.sugar_g_per_100ml}<span className="ml-1 text-xs font-medium text-muted-foreground">g</span></p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Number(can.sugar_g_per_100ml) / 11 * 100)}%` }} /></div>
            </div>}
            {can.taurine_mg_per_100ml != null && <div className="rounded-xl bg-muted/60 p-3">
              <div className="flex items-center gap-2 text-muted-foreground"><FlaskConical className="h-4 w-4 text-primary" /><span className="text-xs">Taurine</span></div>
              <p className="mt-1 text-xl font-black tabular-nums">{can.taurine_mg_per_100ml}<span className="ml-1 text-xs font-medium text-muted-foreground">mg</span></p>
            </div>}
            {can.energy_kcal_per_100ml != null && <div className="rounded-xl bg-muted/60 p-3">
              <div className="flex items-center gap-2 text-muted-foreground"><Zap className="h-4 w-4" /><span className="text-xs">Énergie</span></div>
              <p className="mt-1 text-xl font-black tabular-nums">{can.energy_kcal_per_100ml}<span className="ml-1 text-xs font-medium text-muted-foreground">kcal</span></p>
            </div>}
            {can.volume_ml != null && <div className="col-span-2 flex items-center justify-between rounded-xl border border-dashed px-3 py-2">
              <span className="text-xs text-muted-foreground">Contenance</span><span className="text-sm font-bold">{can.volume_ml} ml</span>
            </div>}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">Les valeurs sont indiquées pour 100 ml. Les barres servent uniquement à visualiser les quantités, pas à noter la boisson.</p>
        </section>
      )}

      {can.history_verified && can.historical_context?.trim() && (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Histoire de la canette</h2>
          <p className="mt-1 leading-relaxed text-muted-foreground">{can.historical_context}</p>
        </section>
      )}

      <div className="mt-5 flex justify-end">
        <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> Contribuez à enrichir les informations
        </button>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contribuer à enrichir les informations</DialogTitle>
            <DialogDescription>Propose une correction ou une information manquante. Elle sera vérifiée avant toute modification de la fiche officielle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="report-category">Information à compléter ou corriger</label>
            <select id="report-category" value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm">
              <option value="name">Nom</option>
              <option value="brand_id">Marque</option>
              <option value="barcode">Code-barres</option>
              <option value="flavour">Saveur</option>
              <option value="release_year">Année de sortie</option>
              <option value="category">Catégorie</option>
              <option value="description">Description</option>
              <option value="historical_context">Contexte historique</option>
              <option value="image_url">Photo principale</option>
              <option value="color_primary">Couleur principale</option>
              <option value="color_secondary">Couleur secondaire</option>
              <option value="caffeine_mg_per_100ml">Caféine (mg / 100 ml)</option>
              <option value="sugar_g_per_100ml">Sucres (g / 100 ml)</option>
              <option value="taurine_mg_per_100ml">Taurine (mg / 100 ml)</option>
              <option value="energy_kcal_per_100ml">Énergie (kcal / 100 ml)</option>
              <option value="volume_ml">Contenance (ml)</option>
              <option value="history_verified">Historique vérifié</option>
            </select>
            {reportCategory !== "image_url" && <><label className="block text-sm font-medium" htmlFor="report-value">Information proposée</label>
            <Input id="report-value" value={reportValue} onChange={(e) => setReportValue(e.target.value)} placeholder="Saisis la valeur proposée" maxLength={1000} className="rounded-xl" /></>}
            <label className="block text-sm font-medium" htmlFor="report-details">Commentaire</label>
            <Textarea id="report-details" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder="Explique pourquoi cette information doit être ajoutée ou remplacée…" maxLength={1000} className="rounded-xl" />
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="report-images">Photos ou images (facultatif)</label>
              <input id="report-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024)) {
                  toast.error("Choisis des images JPG, PNG ou WebP de 8 Mo maximum chacune.");
                  e.currentTarget.value = "";
                  return;
                }
                setReportImages(files.slice(0, 4));
                if (files.length > 4) toast("Quatre images maximum seront envoyées.");
              }} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-semibold file:text-secondary-foreground" />
              {reportImages.length > 0 && <div className="flex flex-wrap gap-2">{reportImages.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border p-2 text-xs"><span className="max-w-32 truncate">{file.name}</span><button type="button" className="text-destructive" onClick={() => setReportImages((current) => current.filter((_, i) => i !== index))}>Retirer</button></div>)}</div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Annuler</Button>
            <Button onClick={() => void submitReport()} disabled={reporting || !reportDetails.trim()}>{reporting ? "Envoi…" : "Envoyer la proposition"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold">Donner ton avis</h2>
        <div className="grid grid-cols-2 gap-3">
          {(["design", "taste"] as const).map((k) => {
            const tasteLocked = k === "taste" && qty === 0;
            return (
              <div key={k} className="rounded-2xl border bg-card p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{k === "design" ? "Design" : "Goût"}</p>
                <div className="mt-2 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} disabled={tasteLocked} onClick={() => void rate(k, n)} aria-label={`Noter ${k === "design" ? "le design" : "le goût"} ${n}`} title={tasteLocked ? "Ajoute cette canette à ta collection pour noter son goût" : undefined} className="disabled:cursor-not-allowed disabled:opacity-30">
                      <Star className={`h-5 w-5 ${(mine?.[k] ?? 0) >= n ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                {tasteLocked && <p className="mt-2 text-[10px] leading-tight text-muted-foreground">Possède cette canette pour noter le goût.</p>}
              </div>
            );
          })}
        </div>
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
