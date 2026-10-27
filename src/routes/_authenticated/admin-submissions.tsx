import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, ImageOff, LoaderCircle, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/lib/data";
import type { Database } from "@/integrations/supabase/types";

type ReviewFilter = "pending" | "approved" | "rejected" | "all";
type SubmissionDraft = {
  name: string;
  barcode: string;
  brand_id: string;
  flavour: string;
  release_year: string;
  category: "Energy Drink" | "Soda" | "Soft Drink" | "Limited Edition";
  description: string;
  image_url: string;
  back_image_url: string;
  barcode_image_url: string;
};
type Report = Database["public"]["Tables"]["can_reports"]["Row"];
type ReportEdit = { field: string; value: string };

const resolveSubmissionImage = (value: string | null | undefined) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.replace(/^\/?storage\/v1\/object\/public\/can-submissions\//, "");
  return supabase.storage.from("can-submissions").getPublicUrl(path).data.publicUrl;
};

const fieldOptions = [
  ["name", "Nom"],
  ["brand_id", "Marque"],
  ["barcode", "Code-barres"],
  ["flavour", "Saveur"],
  ["release_year", "Année de sortie"],
  ["category", "Catégorie"],
  ["description", "Description"],
  ["historical_context", "Contexte historique"],
  ["image_url", "Photo principale"],
  ["color_primary", "Couleur principale"],
  ["color_secondary", "Couleur secondaire"],
  ["caffeine_mg_per_100ml", "Caféine (mg / 100 ml)"],
  ["sugar_g_per_100ml", "Sucres (g / 100 ml)"],
  ["taurine_mg_per_100ml", "Taurine (mg / 100 ml)"],
  ["energy_kcal_per_100ml", "Énergie (kcal / 100 ml)"],
  ["volume_ml", "Contenance (ml)"],
  ["history_verified", "Historique vérifié"],
] as const;

export const Route = createFileRoute("/_authenticated/admin-submissions")({
  head: () => ({ meta: [{ title: "Modération des propositions — Cansdex" }] }),
  component: AdminSubmissions,
});

function AdminSubmissions() {
  const { user } = useAuth();
  const { data: catalog } = useCatalog();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SubmissionDraft | null>(null);
  const [replacementFiles, setReplacementFiles] = useState<Partial<Record<"front" | "back" | "barcode", File>>>({});
  const [reportEdits, setReportEdits] = useState<Record<string, ReportEdit>>({});
  const isAdmin = user?.app_metadata?.["role"] === "admin";

  const submissionsQuery = useQuery({
    queryKey: ["can-submissions-review"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("can_submissions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const reportsQuery = useQuery({
    queryKey: ["can-reports-review"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("can_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Report[];
    },
  });
  const submissions = submissionsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const counts = useMemo(() => ({
    pending: submissions.filter((item) => item.status === "pending").length,
    approved: submissions.filter((item) => item.status === "approved").length,
    rejected: submissions.filter((item) => item.status === "rejected").length,
    all: submissions.length,
  }), [submissions]);
  const visibleSubmissions = useMemo(
    () => submissions.filter((item) => filter === "all" || item.status === filter),
    [filter, submissions],
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["can-submissions-review"] }),
      queryClient.invalidateQueries({ queryKey: ["can-reports-review"] }),
      queryClient.invalidateQueries({ queryKey: ["catalog"] }),
    ]);
  };

  const beginEdit = (item: (typeof submissions)[number]) => {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      barcode: item.barcode,
      brand_id: item.brand_id,
      flavour: item.flavour ?? "",
      release_year: item.release_year?.toString() ?? "",
      category: item.category,
      description: item.description ?? "",
      image_url: item.image_url,
      back_image_url: item.back_image_url ?? "",
      barcode_image_url: item.barcode_image_url ?? "",
    });
    setReplacementFiles({});
  };

  const uploadReplacement = async (file: File, kind: string) => {
    if (!user) throw new Error("Session administrateur introuvable.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choisis une image JPG, PNG ou WebP.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Chaque image doit faire 8 Mo maximum.");
    const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path = `${user.id}/admin-${crypto.randomUUID()}-${kind}.${extension}`;
    const { error } = await supabase.storage.from("can-submissions").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return supabase.storage.from("can-submissions").getPublicUrl(path).data.publicUrl;
  };

  const saveEdit = async (id: string) => {
    if (!draft || !user) return;
    if (!draft.name.trim() || !/^\\d{8,14}$/.test(draft.barcode) || !draft.brand_id) {
      toast.error("Vérifie le nom, le code-barres (8 à 14 chiffres) et la marque.");
      return;
    }
    setBusyId(id);
    try {
      const image_url = replacementFiles.front ? await uploadReplacement(replacementFiles.front, "front") : draft.image_url;
      const back_image_url = replacementFiles.back ? await uploadReplacement(replacementFiles.back, "back") : draft.back_image_url || null;
      const barcode_image_url = replacementFiles.barcode ? await uploadReplacement(replacementFiles.barcode, "barcode") : draft.barcode_image_url || null;
      const { data, error } = await supabase.from("can_submissions").update({
        name: draft.name.trim(),
        barcode: draft.barcode.trim(),
        brand_id: draft.brand_id,
        flavour: draft.flavour.trim() || null,
        release_year: draft.release_year ? Number(draft.release_year) : null,
        category: draft.category,
        description: draft.description.trim() || null,
        image_url,
        back_image_url,
        barcode_image_url,
      }).eq("id", id).eq("status", "pending").select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("La proposition n’est plus en attente ou les droits sont insuffisants.");
      setEditingId(null);
      setDraft(null);
      setReplacementFiles({});
      await refresh();
      toast.success("Modifications enregistrées. Tu peux maintenant publier la version corrigée.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’enregistrer les modifications.");
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (id: string, name: string) => {
    if (editingId === id) {
      toast.error("Enregistre d’abord les modifications avant de publier.");
      return;
    }
    if (!window.confirm(`Accepter « ${name} » et l'ajouter au catalogue officiel ?`)) return;
    setBusyId(id);
    try {
      const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: Error | null }>)("approve_can_submission", { p_submission_id: id });
      if (error) throw error;
      await refresh();
      toast.success("Canette acceptée et ajoutée au catalogue officiel.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible d'accepter cette proposition.");
    } finally {
      setBusyId(null);
    }
  };

  const rejectSubmission = async (id: string) => {
    const reason = window.prompt("Motif du refus (facultatif).");
    if (reason === null || !window.confirm("Confirmer le refus de cette proposition ?")) return;
    if (!user) return;
    setBusyId(id);
    try {
      const { data, error } = await supabase.from("can_submissions").update({
        status: "rejected", review_notes: reason.trim() || null,
        reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      }).eq("id", id).eq("status", "pending").select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Cette proposition a déjà été traitée.");
      setEditingId(null); setDraft(null);
      await refresh();
      toast.success("Proposition refusée.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible de refuser cette proposition.");
    } finally { setBusyId(null); }
  };

  const editFor = (report: Report): ReportEdit => reportEdits[report.id] ?? {
    field: report.proposed_field ?? "name",
    value: report.proposed_value ?? "",
  };

  const reviewReport = async (report: Report, approveIt: boolean) => {
    if (!user) return;
    let reason: string | null = null;
    if (!approveIt) {
      const entered = window.prompt("Motif du refus (facultatif).");
      if (entered === null || !window.confirm("Confirmer le refus de cette proposition ?")) return;
      reason = entered.trim() || null;
    } else if (!window.confirm("Appliquer cette modification au catalogue officiel ?")) return;

    setBusyId(report.id);
    try {
      const edit = editFor(report);
      const { error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: Error | null }>)("review_can_report", {
        p_report_id: report.id,
        p_approve: approveIt,
        p_field: approveIt ? edit.field : null,
        p_value: approveIt ? (edit.value.trim() || null) : null,
        p_review_notes: reason,
      });
      if (error) throw error;
      await refresh();
      toast.success(approveIt ? "Correction appliquée au catalogue." : "Proposition refusée.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible de traiter cette proposition.");
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return <div className="mx-auto max-w-xl py-16 text-center"><h1 className="text-2xl font-black">Accès administrateur requis</h1><p className="mt-2 text-sm text-muted-foreground">Cette page est réservée aux administrateurs autorisés du catalogue.</p></div>;
  }

  const filters: { value: ReviewFilter; label: string }[] = [
    { value: "pending", label: "En attente" }, { value: "approved", label: "Acceptées" },
    { value: "rejected", label: "Refusées" }, { value: "all", label: "Toutes" },
  ];
  const loading = submissionsQuery.isLoading || reportsQuery.isLoading;
  const combinedError = submissionsQuery.error ?? reportsQuery.error;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 pb-8">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Administration · Cansdex</p>
        <h1 className="text-3xl font-black tracking-tight">Modération des contributions</h1>
        <p className="text-sm text-muted-foreground">Corrige les propositions avant publication et traite les améliorations proposées par la communauté.</p>
      </header>

      <section className="space-y-4">
        <div><h2 className="text-xl font-black">Propositions de nouvelles canettes</h2><p className="text-sm text-muted-foreground">Vérifie, modifie et publie les nouvelles références.</p></div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les propositions de canettes">
          {filters.map(({ value, label }) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${filter === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}>{label} <span className="ml-1 opacity-75">{counts[value]}</span></button>)}
          <Button type="button" variant="outline" className="ml-auto" onClick={() => void refresh()} disabled={loading}>Actualiser</Button>
        </div>
        {loading && <div className="flex items-center justify-center gap-2 rounded-2xl border p-8 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Chargement des contributions…</div>}
        {combinedError && <div className="rounded-2xl border border-destructive/30 p-4 text-sm"><p className="font-semibold text-destructive">Impossible de charger toutes les contributions.</p><p className="mt-1 text-muted-foreground">{combinedError.message}</p></div>}
        {!loading && !combinedError && visibleSubmissions.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune proposition de nouvelle canette dans ce filtre.</div>}

        <div className="space-y-5">
          {visibleSubmissions.map((item) => {
            const brandName = catalog?.brands.find((brand) => brand.id === item.brand_id)?.name ?? "Marque inconnue";
            const pending = item.status === "pending";
            const working = busyId === item.id;
            const editing = editingId === item.id && draft !== null;
            const photos = [
              { key: "front" as const, label: "Face avant", url: resolveSubmissionImage(editing && draft ? draft.image_url : item.image_url) },
              { key: "back" as const, label: "Face arrière", url: resolveSubmissionImage(editing && draft ? draft.back_image_url : item.back_image_url) },
              { key: "barcode" as const, label: "Code-barres", url: resolveSubmissionImage(editing && draft ? draft.barcode_image_url : item.barcode_image_url) },
            ];
            return <article key={item.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                <div><h3 className="text-lg font-bold">{editing ? draft.name : item.name}</h3><p className="text-sm text-muted-foreground">{brandName} · <span className="font-mono">{item.barcode}</span></p><p className="mt-1 text-xs text-muted-foreground">Envoyée le {new Date(item.created_at).toLocaleString("fr-FR")}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${pending ? "bg-amber-500/10 text-amber-700" : item.status === "approved" ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>{pending ? "En attente" : item.status === "approved" ? "Acceptée" : "Refusée"}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
                {photos.map(({ key, label, url }) => <div key={key} className="min-w-0">
                  {url ? <a href={url} target="_blank" rel="noreferrer" className="group block" aria-label={`Ouvrir ${label}`}><div className="relative overflow-hidden rounded-xl border bg-muted"><img src={url} alt={`${label} de ${item.name}`} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; const fallback = event.currentTarget.parentElement?.querySelector("[data-image-fallback]"); if (fallback) fallback.classList.remove("hidden"); }} className="max-h-[360px] min-h-36 w-full object-contain" /><span data-image-fallback className="hidden min-h-36 flex items-center justify-center p-3 text-center text-xs text-muted-foreground">Impossible de charger cette image</span><span className="absolute bottom-2 right-2 rounded-full bg-background/90 p-2 shadow"><ExternalLink className="h-4 w-4" /></span></div></a> : <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 text-muted-foreground"><ImageOff className="h-6 w-6" /><span className="mt-2 text-xs">Photo non fournie</span></div>}
                  {editing && <div className="mt-2"><label className="text-xs font-medium">{label} — remplacer</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) setReplacementFiles((current) => ({ ...current, [key]: file })); }} className="mt-1 block w-full text-xs text-muted-foreground" />{replacementFiles[key] && <p className="mt-1 break-all text-xs text-primary">{replacementFiles[key]?.name}</p>}</div>}
                  <p className="mt-2 text-center text-xs font-medium text-muted-foreground">{label}</p>
                </div>)}
              </div>
              {editing && draft ? <div className="grid gap-3 border-t p-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">Nom<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-10 w-full rounded-lg border bg-background px-3" /></label>
                <label className="space-y-1 text-sm font-medium">Code-barres<input value={draft.barcode} onChange={(e) => setDraft({ ...draft, barcode: e.target.value })} inputMode="numeric" className="h-10 w-full rounded-lg border bg-background px-3 font-mono" /></label>
                <label className="space-y-1 text-sm font-medium">Marque<select value={draft.brand_id} onChange={(e) => setDraft({ ...draft, brand_id: e.target.value })} className="h-10 w-full rounded-lg border bg-background px-3">{catalog?.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
                <label className="space-y-1 text-sm font-medium">Saveur<input value={draft.flavour} onChange={(e) => setDraft({ ...draft, flavour: e.target.value })} className="h-10 w-full rounded-lg border bg-background px-3" /></label>
                <label className="space-y-1 text-sm font-medium">Année de sortie<input type="number" min="1900" max={new Date().getFullYear() + 2} value={draft.release_year} onChange={(e) => setDraft({ ...draft, release_year: e.target.value })} className="h-10 w-full rounded-lg border bg-background px-3" /></label>
                <label className="space-y-1 text-sm font-medium">Catégorie<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as SubmissionDraft["category"] })} className="h-10 w-full rounded-lg border bg-background px-3"><option value="Energy Drink">Boisson énergisante</option><option value="Soda">Soda</option><option value="Soft Drink">Boisson sans alcool</option><option value="Limited Edition">Édition limitée</option></select></label>
                <label className="space-y-1 text-sm font-medium sm:col-span-2">Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} maxLength={1000} className="w-full rounded-lg border bg-background px-3 py-2" /></label>
                <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="button" disabled={working} onClick={() => void saveEdit(item.id)}>{working ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Enregistrer les modifications</Button><Button type="button" variant="outline" onClick={() => { setEditingId(null); setDraft(null); setReplacementFiles({}); }}>Annuler</Button></div>
              </div> : <dl className="grid grid-cols-2 gap-4 border-t px-4 py-5 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-muted-foreground">Marque</dt><dd className="mt-1 font-medium">{brandName}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Saveur</dt><dd className="mt-1">{item.flavour || "Non renseignée"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Année</dt><dd className="mt-1">{item.release_year ?? "Non renseignée"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Catégorie</dt><dd className="mt-1">{item.category}</dd></div>
                <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-muted-foreground">Description</dt><dd className="mt-1 whitespace-pre-wrap">{item.description || "Aucune description"}</dd></div>
                {item.review_notes && <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-muted-foreground">Motif du refus</dt><dd className="mt-1 whitespace-pre-wrap">{item.review_notes}</dd></div>}
              </dl>}
              {pending && !editing && <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={working} onClick={() => beginEdit(item)}><Pencil className="mr-2 h-4 w-4" />Modifier avant publication</Button><Button type="button" variant="outline" disabled={working} onClick={() => void rejectSubmission(item.id)}><X className="mr-2 h-4 w-4" />Refuser</Button><Button type="button" disabled={working} onClick={() => void approve(item.id, item.name)}>{working ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Accepter et publier</Button></div>}
            </article>;
          })}
        </div>
      </section>

      <section className="space-y-4 border-t pt-8">
        <div><h2 className="text-xl font-black">Propositions de modifications</h2><p className="text-sm text-muted-foreground">Les signalements déjà enregistrés et les nouvelles propositions de la communauté apparaissent ici.</p></div>
        {reportsQuery.error && <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">Impossible de charger les propositions : {reportsQuery.error.message}</div>}
        {!reportsQuery.isLoading && reports.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune proposition de modification enregistrée.</div>}
        <div className="space-y-4">
          {reports.map((report) => {
            const can = catalog?.cans.find((item) => item.id === report.can_id);
            const brand = catalog?.brands.find((item) => item.id === can?.brand_id);
            const edit = editFor(report);
            const pending = report.status === "pending";
            const working = busyId === report.id;
            const fieldLabel = fieldOptions.find(([value]) => value === edit.field)?.[1] ?? "Champ non précisé";
            return <article key={report.id} className="space-y-4 rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{can?.name ?? "Canette introuvable"}</h3><p className="text-xs text-muted-foreground">{brand?.name ?? "Marque inconnue"} · Code-barres {can?.barcode ?? "indisponible"}</p><p className="mt-1 text-xs text-muted-foreground">Reçue le {new Date(report.created_at).toLocaleString("fr-FR")}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${pending ? "bg-amber-500/10 text-amber-700" : report.status === "approved" ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>{pending ? "En attente" : report.status === "approved" ? "Acceptée" : "Refusée"}</span></div>
              <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Commentaire de l’utilisateur</p><p className="mt-1 whitespace-pre-wrap text-sm">{report.details}</p><p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Information actuelle</p><p className="mt-1 text-sm">{can ? String(edit.field === "brand_id" ? brand?.name ?? "Non renseignée" : (can as unknown as Record<string, unknown>)[edit.field] ?? "Non renseignée") : "Canette introuvable"}</p></div>
              {report.image_urls?.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{report.image_urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border"><img src={url} alt={`Image jointe ${index + 1}`} className="h-40 w-full object-contain" /><p className="p-2 text-xs text-primary">Ouvrir l’image</p></a>)}</div>}
              {pending && <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">Champ à modifier<select value={edit.field} onChange={(e) => setReportEdits((current) => ({ ...current, [report.id]: { ...edit, field: e.target.value } }))} className="h-10 w-full rounded-lg border bg-background px-3">{fieldOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                {edit.field === "brand_id" ? <label className="space-y-1 text-sm font-medium">Marque proposée<select value={edit.value} onChange={(e) => setReportEdits((current) => ({ ...current, [report.id]: { ...edit, value: e.target.value } }))} className="h-10 w-full rounded-lg border bg-background px-3"><option value="">Choisir une marque</option>{catalog?.brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <label className="space-y-1 text-sm font-medium">{fieldLabel} — valeur finale<input value={edit.value} onChange={(e) => setReportEdits((current) => ({ ...current, [report.id]: { ...edit, value: e.target.value } }))} placeholder={edit.field === "image_url" ? "URL d’image, ou laisse vide pour utiliser la première pièce jointe" : "Valeur à appliquer"} className="h-10 w-full rounded-lg border bg-background px-3" /></label>}
                <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="button" disabled={working} onClick={() => void reviewReport(report, true)}><Check className="mr-2 h-4 w-4" />Appliquer et accepter</Button><Button type="button" variant="outline" disabled={working} onClick={() => void reviewReport(report, false)}><X className="mr-2 h-4 w-4" />Refuser</Button></div>
              </div>}
              {report.review_notes && <p className="text-xs text-muted-foreground">Note de modération : {report.review_notes}</p>}
            </article>;
          })}
        </div>
      </section>
    </main>
  );
}
