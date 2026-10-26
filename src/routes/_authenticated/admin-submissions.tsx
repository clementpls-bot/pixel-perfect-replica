import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, ImageOff, LoaderCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/lib/data";

type ReviewFilter = "pending" | "approved" | "rejected" | "all";

export const Route = createFileRoute("/_authenticated/admin-submissions")({
  head: () => ({ meta: [{ title: "Modération des soumissions — Cansdex" }] }),
  component: AdminSubmissions,
});

function AdminSubmissions() {
  const { user } = useAuth();
  const { data: catalog } = useCatalog();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>("pending");
  const isAdmin = user?.app_metadata?.role === "admin";

  const {
    data: submissions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["can-submissions-review"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("can_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const counts = useMemo(() => ({
    pending: submissions?.filter((item) => item.status === "pending").length ?? 0,
    approved: submissions?.filter((item) => item.status === "approved").length ?? 0,
    rejected: submissions?.filter((item) => item.status === "rejected").length ?? 0,
    all: submissions?.length ?? 0,
  }), [submissions]);

  const visibleSubmissions = useMemo(
    () => (submissions ?? []).filter((item) => filter === "all" || item.status === filter),
    [filter, submissions],
  );

  const approve = async (id: string, name: string) => {
    if (!window.confirm(`Accepter « ${name} » et l'ajouter au catalogue officiel ?`)) return;
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("approve_can_submission", { p_submission_id: id });
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["can-submissions-review"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      toast.success("Canette acceptée et ajoutée au catalogue officiel.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible d'accepter cette soumission.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    const enteredReason = window.prompt("Motif du refus (facultatif). Laisse vide pour ne pas préciser de motif.");
    if (enteredReason === null) return;
    if (!window.confirm("Confirmer le refus de cette soumission ?")) return;

    setBusyId(id);
    try {
      const { data, error } = await supabase
        .from("can_submissions")
        .update({
          status: "rejected",
          review_notes: enteredReason.trim() || null,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending")
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Cette soumission a déjà été traitée ou tu n'as pas les droits nécessaires.");
      await queryClient.invalidateQueries({ queryKey: ["can-submissions-review"] });
      toast.success("Soumission refusée.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible de refuser cette soumission.");
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-black">Accès administrateur requis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page est réservée aux administrateurs autorisés du catalogue.
        </p>
      </div>
    );
  }

  const filters: { value: ReviewFilter; label: string }[] = [
    { value: "pending", label: "En attente" },
    { value: "approved", label: "Acceptées" },
    { value: "rejected", label: "Refusées" },
    { value: "all", label: "Toutes" },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Administration · Cansdex</p>
        <h1 className="text-3xl font-black tracking-tight">Modération des soumissions</h1>
        <p className="text-sm text-muted-foreground">
          Vérifie les photos et les informations avant d'ajouter une canette au catalogue officiel.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les soumissions">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${filter === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
          >
            {label} <span className="ml-1 opacity-75">{counts[value]}</span>
          </button>
        ))}
        <Button type="button" variant="outline" className="ml-auto" onClick={() => void refetch()} disabled={isLoading}>
          Actualiser
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border p-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Chargement des soumissions…
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
          <p className="font-semibold text-destructive">Impossible de charger les soumissions.</p>
          <p className="mt-1 text-muted-foreground">{error.message}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => void refetch()}>Réessayer</Button>
        </div>
      )}
      {!isLoading && !error && visibleSubmissions.length === 0 && (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Check className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-bold">{filter === "pending" ? "Tout est à jour !" : "Aucune soumission ici"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "pending" ? "Il n'y a aucune canette en attente de validation." : "Aucune soumission ne correspond à ce filtre."}
          </p>
        </div>
      )}

      <div className="space-y-5">
        {visibleSubmissions.map((submission) => {
          const brandName = catalog?.brands.find((brand) => brand.id === submission.brand_id)?.name ?? "Marque inconnue";
          const photos = [
            { label: "Face avant", url: submission.image_url },
            { label: "Face arrière", url: submission.back_image_url },
            { label: "Code-barres", url: submission.barcode_image_url },
          ];
          const pending = submission.status === "pending";
          const working = busyId === submission.id;

          return (
            <article key={submission.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4 sm:p-5">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold">{submission.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{brandName} · Code-barres : <span className="font-mono text-foreground">{submission.barcode}</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Envoyée le {new Date(submission.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${pending ? "bg-amber-500/10 text-amber-700" : submission.status === "approved" ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
                  {pending ? "En attente" : submission.status === "approved" ? "Acceptée" : "Refusée"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
                {photos.map(({ label, url }) => (
                  <div key={label} className="min-w-0">
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="group block" aria-label={`Ouvrir la photo : ${label}`}>
                        <div className="relative overflow-hidden rounded-xl border bg-muted">
                          <img
                            src={url}
                            alt={`${label} de ${submission.name}`}
                            loading="lazy"
                            className="max-h-[420px] min-h-44 w-full object-contain transition-transform group-hover:scale-[1.02]"
                          />
                          <span className="absolute bottom-2 right-2 rounded-full bg-background/90 p-2 shadow">
                            <ExternalLink className="h-4 w-4" />
                          </span>
                        </div>
                      </a>
                    ) : (
                      <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 text-muted-foreground">
                        <ImageOff className="h-6 w-6" />
                        <span className="mt-2 text-xs">Photo non fournie</span>
                      </div>
                    )}
                    <p className="mt-2 text-center text-xs font-medium text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t px-4 py-5 text-sm sm:grid-cols-3 sm:px-5">
                <div><dt className="text-xs text-muted-foreground">Marque</dt><dd className="mt-1 font-medium">{brandName}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Saveur</dt><dd className="mt-1">{submission.flavour || "Non renseignée"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Année de sortie</dt><dd className="mt-1">{submission.release_year ?? "Non renseignée"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Catégorie</dt><dd className="mt-1">{submission.category}</dd></div>
                <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-muted-foreground">Description</dt><dd className="mt-1 whitespace-pre-wrap">{submission.description || "Aucune description"}</dd></div>
                {submission.review_notes && <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-muted-foreground">Motif du refus</dt><dd className="mt-1 whitespace-pre-wrap">{submission.review_notes}</dd></div>}
              </dl>

              {pending && (
                <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 sm:flex-row sm:justify-end sm:p-5">
                  <Button type="button" disabled={working} onClick={() => void reject(submission.id)} variant="outline" className="h-11 sm:min-w-36">
                    {working ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Refuser
                  </Button>
                  <Button type="button" disabled={working} onClick={() => void approve(submission.id, submission.name)} className="h-11 sm:min-w-44">
                    {working ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Accepter et publier
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
