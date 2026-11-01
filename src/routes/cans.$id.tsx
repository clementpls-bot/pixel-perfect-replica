import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Droplets, FlaskConical, PenLine, Sparkles, Star, Zap, Wine } from "lucide-react";
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
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
  }),
  component: CanPage,
});

type Comment = { id: string; body: string; parent_id: string | null; user_id: string; created_at: string; profiles: { username: string } | null; comment_likes: { user_id: string }[] };

function CanPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
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
  const [drinksDraft, setDrinksDraft] = useState("0");
  const [savingCollection, setSavingCollection] = useState(false);
  const [reportDetails, setReportDetails] = useState("");
  const [reportBarcode, setReportBarcode] = useState("");
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [reporting, setReporting] = useState(false);
  const knownBarcodes = useQuery({
    queryKey: ["can-barcodes", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("can_barcodes").select("id,barcode,status,created_at").eq("can_id", id).order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15_000,
  });
  useEffect(() => {
    const channel = (supabase as any).channel(`can-barcodes-${id}`).on("postgres_changes", { event: "*", schema: "public", table: "can_barcodes", filter: `can_id=eq.${id}` }, () => {
      void qc.invalidateQueries({ queryKey: ["can-barcodes", id] });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, qc]);
  const can = data?.cans.find((c) => c.id === id);
  const brand = data?.brands.find((b) => b.id === can?.brand_id);

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
    if (!reportDetails.trim() && !reportBarcode.trim() && reportImages.length === 0) { toast.error("Ajoute un message, un code-barres ou une image."); return; }
    const proposedBarcode = reportBarcode.trim();
    if (proposedBarcode && !/^\\d{8,14}$/.test(proposedBarcode)) { toast.error("Le code-barres doit contenir de 8 à 14 chiffres."); return; }
    if (proposedBarcode && (data?.cans.some((item: any) => item.barcode === proposedBarcode) || knownBarcodes.data?.some((item: any) => item.barcode === proposedBarcode))) { toast.error("Ce code-barres est déjà connu ou proposé dans le catalogue."); return; }
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
      const { error } = await supabase.from("can_reports").insert({
        can_id: can.id,
        user_id: user.id,
        category: "Contribution libre",
        details: [reportDetails.trim(), proposedBarcode ? `Code-barres supplémentaire proposé : ${proposedBarcode}` : ""].filter(Boolean).join("\n\n") || "Contribution avec images.",
        proposed_field: "general",
        proposed_value: null,
        image_urls: imageUrls,
      });
      if (error) throw error;
      if (proposedBarcode) {
        const { error: barcodeError } = await (supabase as any).from("can_barcodes").insert({ can_id: can.id, barcode: proposedBarcode, submitted_by: user.id, status: "pending" });
        if (barcodeError && barcodeError.code !== "23505") throw barcodeError;
      }
      await qc.invalidateQueries({ queryKey: ["can-barcodes", id] });
      toast.success("Merci ! Ta proposition a été envoyée pour vérification.");
      setReportDetails(""); setReportBarcode(""); setReportImages([]); setReportOpen(false);
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’envoyer la proposition. Réessaie plus tard.");
    } finally {
      setReporting(false);
    }
  };

  const toggleOwnership = async () => {
    if (!user) { toast("Connecte-toi pour gérer ton mur."); return; }
    if (qty === 0) {
      toast("Pour ajouter cette canette, passe par le scanner.");
      return;
    }
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
    if (qty <= 0) {
      toast.error("Tu dois posséder cette canette sur ton mur avant d’ajouter un Drink.");
      return;
    }
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
    if (qty <= 0) {
      setDrinksOpen(false);
      toast.error("Tu dois posséder cette canette sur ton mur avant de modifier ses Drinks.");
      return;
    }
    const count = Number(drinksDraft);
    if (!Number.isInteger(count) || count < (qty > 0 ? 1 : 0) || count > 100000) {
      toast.error(qty > 0 ? "Une canette possédée doit conserver au moins 1 Drink." : "Saisis un nombre entier positif.");
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
    <div className="can-detail-page -mx-4 min-h-screen px-4 pb-8 pt-2" style={{ background: `linear-gradient(180deg, ${can.color_primary}24 0%, ${can.color_secondary}12 34%, transparent 620px)` }}>
      <Link to="/brands/$slug" params={{ slug: brand?.slug ?? "" }} className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />{brand?.name}</Link>
      <div className="relative mt-4 rounded-3xl border p-8" style={{ background: `radial-gradient(circle at 50% 40%, ${can.color_primary}55, transparent 70%)` }}>
        <div className="mx-auto w-28"><CanArt can={can} brandName={brand?.name} missing={qty === 0} /></div>
        {qty === 0 && <p className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Pas encore sur ton mur</p>}
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-primary">{({ "Energy Drink": "Boisson énergisante", Soda: "Soda", "Soft Drink": "Boisson sans alcool", "Limited Edition": "Édition limitée" } as Record<string, string>)[can.category] ?? can.category}</p>
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
        {qty > 0
          ? <Button onClick={() => void toggleOwnership()} disabled={savingCollection || !user} variant="secondary" className="mt-3 h-10 w-full rounded-xl border border-border/60 bg-transparent text-sm font-semibold text-muted-foreground shadow-none hover:bg-muted/50">Retirer du mur</Button>
          : <Link to="/scan" className="mt-3 flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">Scanner pour ajouter au mur</Link>}
        <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wine className="h-4 w-4" />
            <span className="text-sm">Drinks</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums">{canDrinks.data ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => { setDrinksDraft(String(canDrinks.data ?? 0)); setDrinksOpen(true); }} disabled={!user || qty <= 0} className="rounded-full px-2 py-1 text-[11px] text-muted-foreground/75 transition hover:bg-muted hover:text-foreground disabled:opacity-40">Modifier</button>
            <button type="button" onClick={() => void addDrink()} disabled={!user || qty <= 0} aria-label="Dégoupiller une canette et ajouter un Drink" title="Dégoupiller une nouvelle canette" className="drink-tab-button inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-extrabold text-slate-800 shadow-sm transition active:scale-95 disabled:opacity-40">
              <svg viewBox="0 0 32 32" aria-hidden="true" className="h-5 w-5 shrink-0"><circle cx="16" cy="16" r="14" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.8"/><path d="M12 8.5h8a3 3 0 0 1 3 3v2.2a3.3 3.3 0 0 1-3.3 3.3h-1.4l-2.8 6.1a1.8 1.8 0 0 1-3.3-1.4l2.1-4.7h-.8a3.5 3.5 0 0 1-3.5-3.5v-2a3 3 0 0 1 3-3Z" fill="currentColor" fillOpacity=".72"/><circle cx="12" cy="12" r="1.3" fill="white"/></svg>
              +1 Drink
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Tous les utilisateurs : <strong className="text-foreground tabular-nums">{(communityDrinks.data ?? 0).toLocaleString("fr-FR")}</strong> Drinks au total</p>
        {!user && <p className="mt-2 text-xs text-muted-foreground">Connecte-toi pour gérer ton mur et tes Drinks.</p>}
        {user && qty <= 0 && <p className="mt-2 text-xs text-muted-foreground">Ajoute d’abord cette canette à ton mur pour pouvoir enregistrer des Drinks.</p>}
      </div>

      <Dialog open={drinksOpen} onOpenChange={setDrinksOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mes Drinks</DialogTitle>
            <DialogDescription>Posséder cette canette initialise le compteur à 1 Drink minimum. Tu peux ensuite ajuster le total selon tes consommations.</DialogDescription>
          </DialogHeader>
          <label htmlFor="can-drinks-count" className="text-sm font-medium">Nombre de Drinks</label>
          <Input id="can-drinks-count" type="number" min={qty > 0 ? 1 : 0} max={100000} step={1} value={drinksDraft} onChange={(e) => setDrinksDraft(e.target.value)} className="h-12 rounded-xl" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrinksOpen(false)}>Annuler</Button>
            <Button onClick={() => void saveDrinks()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <button onClick={() => setReportOpen(true)} className="contribute-magic-button group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="contribute-magic-sheen" aria-hidden="true" />
          <PenLine className="relative z-10 h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-12" />
          <span className="relative z-10">Contribuer aux informations</span>
          <Sparkles className="contribute-magic-sparkle relative z-10 h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contribuer aux informations</DialogTitle>
            <DialogDescription>Écris librement ce que tu souhaites ajouter ou corriger sur cette canette. Ta contribution sera vérifiée avant publication.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="report-details">Ton message</label>
            <Textarea id="report-details" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder="Une précision sur la canette, son histoire, sa saveur, une erreur à corriger…" maxLength={3000} rows={5} className="rounded-xl" />
            <div className="space-y-1.5 rounded-xl border p-3">
              <label className="block text-sm font-medium" htmlFor="report-barcode">Proposer un code-barres supplémentaire (facultatif)</label>
              <Input id="report-barcode" inputMode="numeric" maxLength={14} value={reportBarcode} onChange={(e) => setReportBarcode(e.target.value.replace(/\D/g, "").slice(0, 14))} placeholder="8 à 14 chiffres" className="rounded-lg" />
              <p className="text-xs text-muted-foreground">Une même canette peut avoir plusieurs codes-barres selon le format ou le pays.</p>
              <div className="mt-3 rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-semibold">Codes-barres connus</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
                    <code className="text-sm font-semibold">{can.barcode}</code>
                    <span className="text-[10px] text-muted-foreground">Principal</span>
                  </div>
                  {(knownBarcodes.data ?? []).map((entry: any) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
                    <code className="text-sm font-semibold">{entry.barcode}</code>
                    <span className={entry.status === "approved" ? "text-[10px] text-muted-foreground" : "text-[10px] font-medium text-amber-600"}>{entry.status === "approved" ? "Vérifié" : "En vérification"}</span>
                  </div>)}
                  {knownBarcodes.isLoading && <p className="text-xs text-muted-foreground">Chargement des autres codes-barres…</p>}
                  {!knownBarcodes.isLoading && !knownBarcodes.data?.length && <p className="text-xs text-muted-foreground">Aucun autre code-barres enregistré pour le moment.</p>}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="report-images">Ajouter des images (jusqu’à 5)</label>
              <input id="report-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024)) {
                  toast.error("Choisis des images JPG, PNG ou WebP de 8 Mo maximum chacune.");
                  e.currentTarget.value = "";
                  return;
                }
                setReportImages((current) => {
                  const combined = [...current, ...files];
                  if (combined.length > 5) toast("Cinq images maximum : seules les cinq premières seront conservées.");
                  return combined.slice(0, 5);
                });
                e.currentTarget.value = "";
              }} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-semibold file:text-secondary-foreground" />
              {reportImages.length > 0 && <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{reportImages.length}/5 image(s) ajoutée(s)</p>
                <div className="flex flex-wrap gap-2">{reportImages.map((file, index) => <div key={file.name + "-" + index} className="flex items-center gap-2 rounded-lg border p-2 text-xs"><span className="max-w-32 truncate">{file.name}</span><button type="button" className="text-destructive" onClick={() => setReportImages((current) => current.filter((_, i) => i !== index))}>Retirer</button></div>)}</div>
              </div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Annuler</Button>
            <Button onClick={() => void submitReport()} disabled={reporting || (!reportDetails.trim() && !reportBarcode.trim() && reportImages.length === 0)}>{reporting ? "Envoi…" : "Envoyer la contribution"}</Button>
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
  );
}

