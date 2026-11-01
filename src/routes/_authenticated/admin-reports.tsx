import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Flag, ArrowLeft, ExternalLink, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type ReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  comment: string;
  photo_paths: string[];
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  reporter_name: string;
  reported_name: string;
  photos: string[];
};

export const Route = createFileRoute("/_authenticated/admin-reports")({
  head: () => ({ meta: [{ title: "Signalements de comptes — Cansdex" },
    { name: "description", content: "Administration et modération de la communauté Cansdex." },
    { property: "og:title", content: "Signalements de comptes — Cansdex" },
    { property: "og:description", content: "Administration et modération de la communauté Cansdex." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AdminProfileReports,
});

function AdminProfileReports() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState("");
  const isAdmin = user?.app_metadata?.["role"] === "admin";
  const reports = useQuery({
    queryKey: ["admin-profile-reports"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profile_reports")
        .select("id,reporter_id,reported_user_id,comment,photo_paths,status,created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      const rows = (data ?? []) as Omit<ReportRow, "reporter_name" | "reported_name" | "photos">[];
      const userIds = [...new Set(rows.flatMap((row) => [row.reporter_id, row.reported_user_id]))];
      const { data: profiles, error: profileError } = await supabase.from("profiles").select("id,username").in("id", userIds);
      if (profileError) throw profileError;
      const names = new Map((profiles ?? []).map((p) => [p.id, p.username]));
      return Promise.all(rows.map(async (row) => {
        const photos = await Promise.all((row.photo_paths ?? []).map(async (path) => {
          const { data } = await supabase.storage.from("profile-reports").createSignedUrl(path, 3600);
          return data?.signedUrl ?? "";
        }));
        return { ...row, reporter_name: names.get(row.reporter_id) ?? "Utilisateur inconnu", reported_name: names.get(row.reported_user_id) ?? "Utilisateur inconnu", photos: photos.filter(Boolean) } as ReportRow;
      }));
    },
  });

  const updateStatus = async (id: string, status: ReportRow["status"]) => {
    setSavingId(id);
    try {
      const { error } = await (supabase as any).from("profile_reports").update({ status }).eq("id", id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["admin-profile-reports"] });
      toast.success("Statut du signalement mis à jour.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible de mettre à jour le signalement.");
    } finally {
      setSavingId("");
    }
  };

  if (!isAdmin) return <div className="space-y-4"><Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Retour au profil</Link><p className="rounded-2xl border p-5 text-sm text-muted-foreground">Cette page est réservée à la modération.</p></div>;

  return <div className="space-y-5">
    <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour au profil</Link>
    <header><h1 className="text-2xl font-black">Signalements de comptes</h1><p className="mt-1 text-sm text-muted-foreground">Consulte les motifs, les pièces jointes et l’état des signalements envoyés par la communauté.</p></header>
    {reports.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Chargement des signalements…</p>
      : reports.error ? <p className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">Impossible de charger les signalements. Vérifie que les migrations Supabase sont appliquées.</p>
      : !reports.data?.length ? <div className="rounded-2xl border border-dashed p-8 text-center"><Flag className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 font-semibold">Aucun signalement</p><p className="mt-1 text-sm text-muted-foreground">Les nouveaux signalements apparaîtront ici.</p></div>
      : <div className="space-y-3">{reports.data.map((report) => <article key={report.id} className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString("fr-FR")}</p><h2 className="mt-1 font-bold">{report.reported_name}</h2><p className="text-xs text-muted-foreground">Signalé par {report.reporter_name}</p></div><span className="rounded-full border px-2 py-1 text-xs font-semibold">{({pending:"En attente",reviewing:"En cours",resolved:"Traité",dismissed:"Classé sans suite"} as Record<string,string>)[report.status] ?? report.status}</span></div>
        <p className="whitespace-pre-wrap break-words rounded-xl bg-muted/50 p-3 text-sm">{report.comment}</p>
        {report.photos.length > 0 && <div className="grid grid-cols-2 gap-2">{report.photos.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border"><img src={url} alt={`Pièce jointe ${index + 1}`} className="max-h-64 w-full object-contain" /><span className="flex items-center justify-center gap-1 p-2 text-xs font-semibold">Ouvrir la photo <ExternalLink className="h-3 w-3" /></span></a>)}</div>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(["pending","reviewing","resolved","dismissed"] as const).map((status) => <Button key={status} size="sm" variant={report.status === status ? "default" : "outline"} disabled={savingId === report.id || report.status === status} className="rounded-lg" onClick={() => void updateStatus(report.id, status)}>{savingId === report.id ? "Enregistrement…" : ({pending:"En attente",reviewing:"En cours",resolved:"Traité",dismissed:"Classer"} as Record<string,string>)[status]}</Button>)}</div>
      </article>)}</div>}
  </div>;
}
