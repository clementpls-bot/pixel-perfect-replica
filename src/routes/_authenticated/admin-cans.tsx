import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCatalog, type Can } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin-cans")({
  head: () => ({ meta: [{ title: "Gestion des canettes — Cansdex" }] }),
  component: AdminCans,
});

type Draft = {
  name: string; barcode: string; brand_id: string; release_year: string;
  flavour: string; description: string; historical_context: string;
  image_url: string; back_image_url: string; barcode_image_url: string;
  color_primary: string; color_secondary: string; category: string;
  caffeine_mg_per_100ml: string; sugar_g_per_100ml: string;
  taurine_mg_per_100ml: string; energy_kcal_per_100ml: string;
  volume_ml: string; history_verified: boolean; variant_name: string;
  region: string; edition_type: string; tab_color: string; notes: string;
};
const toDraft = (can: Can): Draft => ({
  name: can.name ?? "", barcode: can.barcode ?? "", brand_id: can.brand_id ?? "",
  release_year: can.release_year?.toString() ?? "", flavour: can.flavour ?? "",
  description: can.description ?? "", historical_context: can.historical_context ?? "",
  image_url: can.image_url ?? "", back_image_url: can.back_image_url ?? "",
  barcode_image_url: can.barcode_image_url ?? "", color_primary: can.color_primary ?? "#222222",
  color_secondary: can.color_secondary ?? "#ffffff", category: can.category ?? "Energy Drink",
  caffeine_mg_per_100ml: can.caffeine_mg_per_100ml?.toString() ?? "",
  sugar_g_per_100ml: can.sugar_g_per_100ml?.toString() ?? "",
  taurine_mg_per_100ml: can.taurine_mg_per_100ml?.toString() ?? "",
  energy_kcal_per_100ml: can.energy_kcal_per_100ml?.toString() ?? "",
  volume_ml: can.volume_ml?.toString() ?? "", history_verified: can.history_verified ?? false,
  variant_name: can.variant_name ?? "", region: can.region ?? "",
  edition_type: can.edition_type ?? "standard", tab_color: can.tab_color ?? "",
  notes: can.notes ?? "",
});
const nullableNumber = (value: string) => value.trim() === "" ? null : Number(value);
const nullableText = (value: string) => value.trim() || null;

function AdminCans() {
  const { user } = useAuth();
  const { data: catalog, isLoading, error } = useCatalog();
  const qc = useQueryClient();
  const isAdmin = user?.app_metadata?.["role"] === "admin";
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return (catalog?.cans ?? []).filter((can) => {
      const brand = catalog?.brands.find((item) => item.id === can.brand_id)?.name ?? "";
      return !query || [can.name, can.barcode, brand, can.flavour ?? ""].some((v) => v.toLocaleLowerCase("fr").includes(query));
    }).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [catalog, search]);
  const selected = catalog?.cans.find((can) => can.id === selectedId) ?? null;
  const brandName = (id: string) => catalog?.brands.find((brand) => brand.id === id)?.name ?? "Marque inconnue";
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((old) => old ? { ...old, [key]: value } : old);
  const beginEdit = (can: Can) => { setSelectedId(can.id); setDraft(toDraft(can)); };

  const save = async () => {
    if (!selected || !draft) return;
    if (!draft.name.trim() || !draft.barcode.trim() || !draft.brand_id) {
      toast.error("Le nom, le code-barres et la marque sont obligatoires.");
      return;
    }
    const numericFields = [draft.release_year, draft.caffeine_mg_per_100ml, draft.sugar_g_per_100ml, draft.taurine_mg_per_100ml, draft.energy_kcal_per_100ml, draft.volume_ml];
    if (numericFields.some((v) => v.trim() !== "" && !Number.isFinite(Number(v)))) {
      toast.error("Vérifie les champs numériques.");
      return;
    }
    setSaving(true);
    try {
      const { error: saveError } = await supabase.from("cans").update({
        name: draft.name.trim(), barcode: draft.barcode.trim(), brand_id: draft.brand_id,
        release_year: nullableNumber(draft.release_year), flavour: nullableText(draft.flavour),
        description: nullableText(draft.description), historical_context: nullableText(draft.historical_context),
        image_url: nullableText(draft.image_url), back_image_url: nullableText(draft.back_image_url),
        barcode_image_url: nullableText(draft.barcode_image_url), color_primary: draft.color_primary.trim(),
        color_secondary: draft.color_secondary.trim(), category: draft.category,
        caffeine_mg_per_100ml: nullableNumber(draft.caffeine_mg_per_100ml),
        sugar_g_per_100ml: nullableNumber(draft.sugar_g_per_100ml),
        taurine_mg_per_100ml: nullableNumber(draft.taurine_mg_per_100ml),
        energy_kcal_per_100ml: nullableNumber(draft.energy_kcal_per_100ml),
        volume_ml: nullableNumber(draft.volume_ml), history_verified: draft.history_verified,
        variant_name: draft.variant_name.trim(), region: nullableText(draft.region),
        edition_type: draft.edition_type, tab_color: nullableText(draft.tab_color),
        notes: nullableText(draft.notes),
      }).eq("id", selected.id);
      if (saveError) throw saveError;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["catalog"] }),
        qc.invalidateQueries({ queryKey: ["can", selected.id] }),
      ]);
      toast.success("Fiche de canette enregistrée.");
    } catch (e) {
      toast.error((e as Error).message || "Impossible d’enregistrer la canette.");
    } finally { setSaving(false); }
  };

  if (!isAdmin) return <main className="mx-auto max-w-xl py-16 text-center"><h1 className="text-2xl font-black">Accès administrateur requis</h1><p className="mt-2 text-sm text-muted-foreground">Cette interface est réservée au compte administrateur.</p><Button asChild className="mt-5"><Link to="/profile">Retour au profil</Link></Button></main>;

  const textField = (label: string, key: keyof Draft, placeholder = "") => (
    <label className="block space-y-1.5 text-sm" key={key}><span className="font-medium">{label}</span>
      <Input value={String(draft?.[key] ?? "")} placeholder={placeholder} onChange={(e) => set(key, e.target.value as never)} />
    </label>
  );
  const areaField = (label: string, key: "description" | "historical_context" | "notes") => (
    <label className="block space-y-1.5 text-sm" key={key}><span className="font-medium">{label}</span>
      <Textarea value={draft?.[key] ?? ""} onChange={(e) => set(key, e.target.value)} rows={3} />
    </label>
  );

  return <main className="mx-auto w-full max-w-6xl space-y-6 pb-10">
    <header className="space-y-2">
      <Button asChild variant="ghost" size="sm"><Link to="/profile"><ArrowLeft className="mr-2 h-4 w-4" />Retour au profil</Link></Button>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Administration · Cansdex</p>
      <h1 className="text-3xl font-black tracking-tight">Gestion du catalogue</h1>
      <p className="text-sm text-muted-foreground">Sélectionne une canette pour modifier sa fiche complète. Les changements sont enregistrés directement dans Supabase.</p>
    </header>
    {!catalog && isLoading ? <p className="text-sm text-muted-foreground">Chargement du catalogue…</p> : null}
    {error ? <p className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">Erreur de chargement : {(error as Error).message}</p> : null}
    <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.5fr)]">
      <section className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Nom, marque, saveur, code-barres…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <p className="text-xs text-muted-foreground">{filtered.length} canette(s)</p>
        <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-2xl border p-2">
          {filtered.map((can) => <button key={can.id} type="button" onClick={() => beginEdit(can)} className={`w-full rounded-xl border p-3 text-left transition hover:border-primary ${selectedId === can.id ? "border-primary bg-primary/5" : "border-transparent"}`}>
            <span className="block text-sm font-bold">{can.name}</span><span className="mt-1 block text-xs text-muted-foreground">{brandName(can.brand_id)} · {can.release_year ?? "Année inconnue"}</span>
          </button>)}
          {!filtered.length && <p className="p-4 text-sm text-muted-foreground">Aucune canette trouvée.</p>}
        </div>
      </section>
      <section className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
        {!selected || !draft ? <div className="py-12 text-center text-sm text-muted-foreground">Choisis une canette dans la liste pour ouvrir sa fiche éditable.</div> : <>
          <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">{selected.name}</h2><p className="text-xs text-muted-foreground">ID : {selected.id}</p></div><Button type="button" variant="ghost" size="icon" aria-label="Réinitialiser les modifications" onClick={() => setDraft(toDraft(selected))}><X className="h-4 w-4" /></Button></div>
          {selected.image_url && <img src={draft.image_url || selected.image_url} alt="" className="mb-5 h-40 w-full rounded-xl border bg-muted object-contain" />}
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("Nom", "name")}{textField("Code-barres", "barcode")}
            <label className="block space-y-1.5 text-sm"><span className="font-medium">Marque</span><select className="h-10 w-full rounded-md border bg-background px-3" value={draft.brand_id} onChange={(e) => set("brand_id", e.target.value)}>{catalog?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            {textField("Année de sortie", "release_year", "Ex. 2024")}{textField("Saveur", "flavour")}
            {textField("Variante", "variant_name")}{textField("Région / pays", "region")}
            {textField("Type d’édition", "edition_type")}{textField("Catégorie", "category")}
            {textField("Contenance (ml)", "volume_ml")}{textField("Caféine (mg / 100 ml)", "caffeine_mg_per_100ml")}
            {textField("Sucres (g / 100 ml)", "sugar_g_per_100ml")}{textField("Taurine (mg / 100 ml)", "taurine_mg_per_100ml")}
            {textField("Énergie (kcal / 100 ml)", "energy_kcal_per_100ml")}
            {textField("Couleur principale (hex)", "color_primary")}{textField("Couleur secondaire (hex)", "color_secondary")}
            {textField("Couleur de la languette", "tab_color")}
            {textField("URL photo principale", "image_url")}{textField("URL photo arrière", "back_image_url")}
            {textField("URL image du code-barres", "barcode_image_url")}
          </div>
          <div className="mt-4 space-y-4">{areaField("Description", "description")}{areaField("Contexte historique", "historical_context")}{areaField("Notes complémentaires", "notes")}</div>
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.history_verified} onChange={(e) => set("history_verified", e.target.checked)} /> Historique vérifié</label>
          <div className="mt-6 flex flex-wrap gap-2"><Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Enregistrement…" : <><Save className="mr-2 h-4 w-4" />Enregistrer la fiche</>}</Button><Button type="button" variant="outline" asChild><Link to="/cans/$id" params={{ id: selected.id }} target="_blank">Voir la page publique</Link></Button></div>
        </>}
      </section>
    </div>
  </main>;
}
