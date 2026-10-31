import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type CSSProperties } from "react";
import { ArrowLeft, Droplets, FlaskConical, PenLine, ScanBarcode, Star, Zap, Wine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCanDrinks, useCatalog, useOwned, useSetCanDrinks, useSetCanOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CanCommunity } from "@/components/CanCommunity";

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
  const canDrinks = useCanDrinks(id);
  const communityDrinks = useQuery({
    queryKey: ["can-drinks-community", id],
    queryFn: async () => {
      const { data: total, error } = await supabase.rpc("get_total_can_drinks", { p_can_id: id });
      if (error) throw error;
      return Number(total ?? 0);
    },
    staleTime: 30_000,
  });
  const setCanDrinks = useSetCanDrinks();
  const setCanOwned = useSetCanOwned();
  const [reportOpen, setReportOpen] = useState(false);
  const [drinksOpen, setDrinksOpen] = useState(false);
  const [drinksDraft, setDrinksDraft] = useState("1");
  const [savingCollection, setSavingCollection] = useState(false);
  const [reportCategory, setReportCategory] = useState("name");
  const [reportValue, setReportValue] = useState("");
  const [reportBarcode, setReportBarcode] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [reporting, setReporting] = useState(false);
  const qc = useQueryClient();
  const can = data?.cans.find((c) => c.id === id);
  const brand = data?.brands.find((b) => b.id === can?.brand_id);

  const knownBarcodes = useQuery({
    queryKey: ["can-barcodes", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("can_barcodes")
        .select("id,barcode,status,created_at")
        .eq("can_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ratings = useQuery({
    queryKey: ["ratings", id],
    queryFn: async () => (await supabase.from("ratings").select("user_id,design,taste").eq("can_id", id)).data ?? [],
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
  const canTheme = {
    "--primary": `color-mix(in srgb, ${can.color_primary} 38%, white)`,
    "--primary-foreground": `color-mix(in srgb, ${can.color_primary} 62%, #241b31)`,
    "--ring": `color-mix(in srgb, ${can.color_primary} 55%, white)`,
    "--secondary": `color-mix(in srgb, ${can.color_secondary} 28%, white)`,
    "--secondary-foreground": `color-mix(in srgb, ${can.color_secondary} 58%, #241b31)`,
    "--accent": `color-mix(in srgb, ${can.color_primary} 16%, white)`,
    "--accent-foreground": `color-mix(in srgb, ${can.color_primary} 62%, #241b31)`,
  } as CSSProperties & Record<"--primary" | "--primary-foreground" | "--ring" | "--secondary" | "--secondary-foreground" | "--accent" | "--accent-foreground", string>;
  const mine = ratings.data?.find((r) => r.user_id === user?.id);

  const rate = async (k: "design" | "taste", v: number) => {
    if (!user) { toast("Connecte-toi pour noter cette canette."); return; }
    if (k === "taste" && qty === 0) {
      toast("Ajoute d’abord cette canette à ton mur pour noter son goût.");
      return;
    }
    const { error } = await supabase.from("ratings").upsert({ can_id: id, user_id: user.id, design: k === "design" ? v : mine?.design ?? null, taste: k === "taste" ? v : mine?.taste ?? null, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ratings", id] });
  };

  const submitReport = async () => {
    if (!user) { toast("Connecte-toi pour contribuer."); return; }
    const proposedBarcode = reportBarcode.trim();
    if (!reportDetails.trim() && !proposedBarcode && reportImages.length === 0) { toast.error("Ajoute un commentaire, un code-barres ou une image."); return; }
    if (proposedBarcode && !/^[0-9]{8,14}$/.test(proposedBarcode)) { toast.error("Le code-barres doit contenir de 8 à 14 chiffres."); return; }
    if (proposedBarcode && (proposedBarcode === can.barcode || knownBarcodes.data?.some((item: { barcode: string }) => item.barcode === proposedBarcode))) { toast.error("Ce code-barres est déjà connu ou proposé pour cette canette."); return; }
    if (reportDetails.trim() && !reportValue.trim() && reportCategory !== "image_url") { toast.error("Indique l’information que tu proposes."); return; }
    if (reportCategory === "image_url" && !reportValue.trim() && reportImages.length === 0) { toast.error("Ajoute au moins une image ou une URL de photo."); return; }
    setReporting(true);
    try {
      const imageUrls: string[] = [];
      for (const file of reportImages) {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("can-submissions").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (uploadError) throw uploadError;
        imageUrls.push(supabase.storage.from("can-submissions").getPublicUrl(path).data.publicUrl);
      }
      if (reportDetails.trim() || imageUrls.length > 0) {
      const { error } = await supabase.from("can_reports").insert({
        can_id: can.id,
        user_id: user.id,
        category: "Information incorrecte",
        details: reportDetails.trim() || "Contribution avec pièces jointes.",
        proposed_field: reportCategory,
        proposed_value: reportValue.trim() || null,
        image_urls: imageUrls,
      });
      if (error) throw error;
      }
      if (proposedBarcode) {
        const { error: barcodeError } = await (supabase as any).from("can_barcodes").insert({ can_id: can.id, barcode: proposedBarcode, submitted_by: user.id, status: "pending" });
        if (barcodeError) {
          if (barcodeError.code === "23505") throw new Error("Ce code-barres a déjà été proposé.");
          throw barcodeError;
        }
        await qc.invalidateQueries({ queryKey: ["can-barcodes", id] });
      }
      toast.success("Merci ! Ta proposition a été envoyée pour vérification.");
      setReportDetails(""); setReportValue(""); setReportBarcode(""); setReportImages([]); setReportCategory("name"); setReportOpen(false);
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’envoyer la proposition. Réessaie plus tard.");
    } finally {
      setReporting(false);
    }
  };

  const toggleOwnership = async () => {
    if (!user || qty === 0) return;
    setSavingCollection(true);
    try {
      await setCanOwned(can.id, false);
      toast.success("Canette retirée de ton mur.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible de mettre à jour ton mur.");
    } finally {
      setSavingCollection(false);
    }
  };

  const addDrink = async () => {
    if (!user) { toast("Connecte-toi pour enregistrer tes Drinks."); return; }
    try {
      if ("vibrate" in navigator) navigator.vibrate?.(35);
      await setCanDrinks(can.id, (canDrinks.data ?? 0) + 1);
      toast.success("Nouveau Drink ajouté !");
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’ajouter ce Drink.");
    }
  };

  const saveDrinks = async () => {
    if (!user) { toast("Connecte-toi pour enregistrer tes Drinks."); return; }
    const count = Number(drinksDraft);
    if (!Number.isInteger(count) || count < 1 || count > 100000) {
      toast.error("Saisis un nombre entier positif.");
      return;
    }
    try {
      await setCanDrinks(can.id, count);
      setDrinksOpen(false);
      toast.success("Drinks mis à jour.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’enregistrer les Drinks.");
    }
  };

  return (
    <div className="can-detail-page mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-3 sm:px-6 lg:px-8" style={{ ...canTheme, background: `linear-gradient(180deg, ${can.color_primary}24 0%, ${can.color_secondary}12 34%, transparent 620px)` }}>
      <Link to="/brands/$slug" params={{ slug: brand?.slug ?? "" }} className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />{brand?.name}</Link>
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)] lg:items-start xl:gap-10">
        <div className="min-w-0">
          <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-3xl border p-8 sm:min-h-[440px] lg:sticky lg:top-6 lg:min-h-[560px] lg:p-12" style={{ background: `radial-gradient(circle at 50% 40%, ${can.color_primary}55, transparent 70%)` }}>
            <div className="mx-auto w-40 sm:w-48 lg:w-56"><CanArt can={can} brandName={brand?.name} missing={qty === 0} /></div>
            {qty === 0 && <p className="absolute bottom-5 left-4 right-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Pas encore sur ton mur</p>}
          </div>
        </div>
        <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">{({ "Energy Drink": "Boisson énergisante", Soda: "Soda", "Soft Drink": "Boisson sans alcool", "Limited Edition": "Édition limitée" } as Record<string, string>)[can.category] ?? can.category}</p>
      <h1 className="text-2xl font-black">{can.name}</h1>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {can.volume_ml && <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold">{can.volume_ml} ml</span>}
        {can.region && <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold">{can.region}</span>}
        {can.tab_color && <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold">Languette {can.tab_color}</span>}
      </div>
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

      <div className="mt-4 rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Mon mur</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{qty > 0 ? "Cette canette est sur ton mur." : "Tu possèdes cette canette ?"}</p>
          </div>
          <span className={qty > 0 ? "rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary" : "rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground"}>{qty > 0 ? "Possédée" : "Non possédée"}</span>
        </div>
        {qty > 0 ? (
          <Button onClick={() => void toggleOwnership()} disabled={savingCollection || !user} variant="secondary" className="mt-3 h-10 w-full rounded-xl text-sm font-semibold border border-border/60 bg-transparent text-muted-foreground shadow-none hover:bg-muted/50">
            Retirer du mur
          </Button>
        ) : user ? (
          <Link to="/scan" className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/60 px-4 text-sm font-bold shadow-sm transition hover:brightness-[0.98] active:scale-[0.99]" style={{ background: `linear-gradient(110deg, color-mix(in srgb, ${can.color_primary} 36%, white), color-mix(in srgb, ${can.color_secondary} 32%, white))`, color: `color-mix(in srgb, ${can.color_primary} 68%, #241b31)` }}>
            <ScanBarcode className="h-4 w-4" />Scanner pour ajouter au mur
          </Link>
        ) : (
          <Button disabled className="mt-3 h-10 w-full rounded-xl text-sm font-semibold">Connecte-toi pour scanner</Button>
        )}
        <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wine className="h-4 w-4" />
            <span className="text-sm">Drinks</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums">{qty > 0 ? Math.max(1, canDrinks.data ?? 1) : 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => { setDrinksDraft(String(Math.max(1, canDrinks.data ?? 1))); setDrinksOpen(true); }} disabled={!user || qty === 0} className="rounded-full px-2 py-1 text-[11px] text-muted-foreground/75 transition hover:bg-muted hover:text-foreground disabled:opacity-40">Modifier</button>
            <button type="button" onClick={() => void addDrink()} disabled={!user || qty === 0} aria-label="Dégoupiller une canette et ajouter un Drink" title="Dégoupiller une nouvelle canette" className="drink-tab-button inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-extrabold text-slate-800 shadow-sm transition active:scale-95 disabled:opacity-40" style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${can.color_primary} 30%, white) 0%, color-mix(in srgb, ${can.color_secondary} 30%, white) 52%, color-mix(in srgb, ${can.color_primary} 15%, #dff7f1) 100%)`, borderColor: `color-mix(in srgb, ${can.color_primary} 24%, white)`, boxShadow: `0 3px 0 color-mix(in srgb, ${can.color_primary} 15%, white), 0 5px 14px color-mix(in srgb, ${can.color_primary} 18%, transparent)` }}>
              <svg viewBox="0 0 32 32" aria-hidden="true" className="h-5 w-5 shrink-0"><circle cx="16" cy="16" r="14" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.8"/><path d="M12 8.5h8a3 3 0 0 1 3 3v2.2a3.3 3.3 0 0 1-3.3 3.3h-1.4l-2.8 6.1a1.8 1.8 0 0 1-3.3-1.4l2.1-4.7h-.8a3.5 3.5 0 0 1-3.5-3.5v-2a3 3 0 0 1 3-3Z" fill="currentColor" fillOpacity=".72"/><circle cx="12" cy="12" r="1.3" fill="white"/></svg>
              +1 Drink
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Tous les utilisateurs : <strong className="text-foreground tabular-nums">{(communityDrinks.data ?? 0).toLocaleString("fr-FR")}</strong> Drinks au total</p>
        {!user && <p className="mt-2 text-xs text-muted-foreground">Connecte-toi pour gérer ton mur et tes Drinks.</p>}
      </div>
        </div>
      </div>

      <Dialog open={drinksOpen} onOpenChange={setDrinksOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mes Drinks</DialogTitle>
            <DialogDescription>Combien de fois as-tu bu cette boisson ? Une canette présente sur ton mur commence à 1 Drink minimum.</DialogDescription>
          </DialogHeader>
          <label htmlFor="can-drinks-count" className="text-sm font-medium">Nombre de Drinks</label>
          <Input id="can-drinks-count" type="number" min={1} max={100000} step={1} value={drinksDraft} onChange={(e) => setDrinksDraft(e.target.value)} className="h-12 rounded-xl" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrinksOpen(false)}>Annuler</Button>
            <Button onClick={() => void saveDrinks()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
      {can.description?.trim() && <section className="min-w-0 rounded-2xl border bg-card p-5"><h2 className="mb-2 text-sm font-bold">À propos</h2><p className="leading-relaxed text-muted-foreground">{can.description}</p></section>}

      {(can.caffeine_mg_per_100ml != null || can.sugar_g_per_100ml != null || can.taurine_mg_per_100ml != null || can.energy_kcal_per_100ml != null || can.volume_ml != null) && (
        <section className="min-w-0 rounded-2xl border bg-card p-5">
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
        <section className="min-w-0 rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Histoire de la canette</h2>
          <p className="mt-1 leading-relaxed text-muted-foreground">{can.historical_context}</p>
        </section>
      )}

      </div>

      <div className="mt-5 flex justify-end">
        <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <PenLine className="h-3.5 w-3.5" /> Contribuer aux informations
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
            <select id="report-category" value={reportCategory} onChange={(e) => { setReportCategory(e.target.value); setReportValue(""); }} className="w-full rounded-xl border bg-background px-3 py-2 text-sm">
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
            {reportCategory === "brand_id" ? <div className="space-y-1"><label className="block text-sm font-medium" htmlFor="report-value">Marque proposée</label><select id="report-value" value={reportValue} onChange={(e) => setReportValue(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm"><option value="">Choisir une marque</option>{data?.brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div> : reportCategory === "category" ? <div className="space-y-1"><label className="block text-sm font-medium" htmlFor="report-value">Catégorie proposée</label><select id="report-value" value={reportValue} onChange={(e) => setReportValue(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm"><option value="">Choisir une catégorie</option><option value="Energy Drink">Boisson énergisante</option><option value="Soda">Soda</option><option value="Soft Drink">Boisson sans alcool</option><option value="Limited Edition">Édition limitée</option></select></div> : reportCategory === "history_verified" ? <div className="space-y-1"><label className="block text-sm font-medium" htmlFor="report-value">Historique vérifié ?</label><select id="report-value" value={reportValue} onChange={(e) => setReportValue(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm"><option value="">Choisir</option><option value="true">Oui</option><option value="false">Non</option></select></div> : reportCategory !== "image_url" && <div className="space-y-1"><label className="block text-sm font-medium" htmlFor="report-value">Information proposée</label><Input id="report-value" value={reportValue} onChange={(e) => setReportValue(e.target.value)} placeholder="Saisis la valeur proposée" maxLength={1000} className="rounded-xl" /></div>}
            <div className="space-y-1.5 rounded-xl border p-3">
              <label className="block text-sm font-medium" htmlFor="report-barcode">Proposer un code-barres supplémentaire (facultatif)</label>
              <Input id="report-barcode" inputMode="numeric" maxLength={14} value={reportBarcode} onChange={(e) => setReportBarcode(e.target.value.replace(/\D/g, "").slice(0, 14))} placeholder="8 à 14 chiffres" className="rounded-lg" />
              <p className="text-xs text-muted-foreground">Pour une même canette, un code-barres différent peut correspondre à un autre format ou pays.</p>
              {(knownBarcodes.data ?? []).length > 0 && <div className="space-y-1"><p className="text-xs font-semibold">Autres codes connus</p>{knownBarcodes.data?.map((entry: { id: string; barcode: string; status: string }) => <div key={entry.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5 text-xs"><code>{entry.barcode}</code><span className="text-muted-foreground">{entry.status === "approved" ? "Vérifié" : "En attente"}</span></div>)}</div>}
            </div>
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
            <Button onClick={() => void submitReport()} disabled={reporting || (!reportDetails.trim() && !reportBarcode.trim() && reportImages.length === 0)}>{reporting ? "Envoi…" : "Envoyer la proposition"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="min-w-0 rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold">Donner ton avis</h2>
        <div className="grid grid-cols-2 gap-3">
          {(["design", "taste"] as const).map((k) => {
            const tasteLocked = k === "taste" && qty === 0;
            return (
              <div key={k} className="rounded-2xl border bg-card p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{k === "design" ? "Design" : "Goût"}</p>
                <div className="mt-2 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} disabled={tasteLocked} onClick={() => void rate(k, n)} aria-label={`Noter ${k === "design" ? "le design" : "le goût"} ${n}`} title={tasteLocked ? "Ajoute cette canette à ton mur pour noter son goût" : undefined} className="disabled:cursor-not-allowed disabled:opacity-30">
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

      <CanCommunity canId={id} canName={can.name} />
      </div>
    </div>
  );
}

