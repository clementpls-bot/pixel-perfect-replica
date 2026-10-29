import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Flag, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCatalog } from "@/lib/data";
import { computeAchievements } from "@/lib/achievements";
import { ProgressBar } from "@/components/ProgressBar";
import { CanArt } from "@/components/CanArt";
import { Button } from "@/components/ui/button";
import { pastelCanColor } from "@/lib/can-colors";
import { AvatarZoom, ProfileBanner } from "@/components/ProfileMedia";

export const Route = createFileRoute("/users/$id")({
  head: () => ({ meta: [
    { title: "Profil collectionneur — Cansdex" },
    { name: "description", content: "Découvre la collection, les succès et les échanges d’un collectionneur Cansdex." },
  ] }),
  component: PublicUserProfile,
});

type PublicProfile = { id: string; username: string; avatar_url: string | null; banner_url: string | null; created_at: string };
type UserComment = { id: string; can_id: string; body: string | null; image_url: string | null; parent_id: string | null; created_at: string };
type CanSummary = { id: string; name: string; image_url: string | null; color_primary: string };

function PublicUserProfile() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: catalog } = useCatalog();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportPhotos, setReportPhotos] = useState<File[]>([]);
  const [sendingReport, setSendingReport] = useState(false);
  const [wallOpen, setWallOpen] = useState(false);

  const profile = useQuery({
    queryKey: ["public-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,username,avatar_url,banner_url,created_at").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as PublicProfile | null;
    },
  });
  const comments = useQuery({
    queryKey: ["public-profile-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("comments")
        .select("id,can_id,body,image_url,parent_id,created_at")
        .eq("user_id", id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      const rows = (data ?? []) as UserComment[];
      const canIds = [...new Set(rows.map((comment) => comment.can_id))];
      if (!canIds.length) return { comments: rows, cans: [] as CanSummary[] };
      const { data: cans, error: cansError } = await supabase.from("cans").select("id,name,image_url,color_primary").in("id", canIds);
      if (cansError) throw cansError;
      return { comments: rows, cans: (cans ?? []) as CanSummary[] };
    },
  });
  const ownedQuery = useQuery({
    queryKey: ["public-profile-owned", id],
    enabled: !!profile.data,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_cans").select("can_id,quantity").eq("user_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const drinksQuery = useQuery({
    queryKey: ["public-profile-drinks", id],
    enabled: !!profile.data,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_can_drinks").select("can_id,drinks_count").eq("user_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const canMap = new Map((comments.data?.cans ?? []).map((can) => [can.id, can]));
  const ownedRows = ownedQuery.data ?? [];
  const ownedIds = new Set(ownedRows.map((row) => row.can_id));
  const drinks = (drinksQuery.data ?? []).reduce((sum, row) => sum + (row.drinks_count ?? 0), 0);
  const totalCans = ownedRows.reduce((sum, row) => sum + (row.quantity ?? 1), 0);
  const achievements = catalog ? computeAchievements({ ownedCanIds: ownedIds, cans: catalog.cans, brands: catalog.brands }) : [];
  const brandProgress = catalog?.brands.map((brand) => {
    const cans = catalog.cans.filter((can) => can.brand_id === brand.id);
    return { ...brand, total: cans.length, have: cans.filter((can) => ownedIds.has(can.id)).length };
  }).filter((brand) => brand.total > 0).sort((a, b) => (b.have / b.total) - (a.have / a.total)) ?? [];
  const wallCans = catalog?.cans.filter((can) => ownedIds.has(can.id)) ?? [];

  const submitReport = async () => {
    if (!user) { toast.error("Connecte-toi pour signaler un compte."); return; }
    if (user.id === id) { toast.error("Tu ne peux pas signaler ton propre compte."); return; }
    if (reportText.trim().length < 3) { toast.error("Explique brièvement le motif du signalement."); return; }
    setSendingReport(true);
    try {
      const paths: string[] = [];
      for (const file of reportPhotos) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Les photos doivent être au format JPG, PNG ou WebP.");
        if (file.size > 5 * 1024 * 1024) throw new Error("Chaque photo doit faire 5 Mo maximum.");
        const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${user.id}/${id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("profile-reports").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        paths.push(path);
      }
      const { error } = await (supabase as any).from("profile_reports").insert({
        reporter_id: user.id, reported_user_id: id, comment: reportText.trim(), photo_paths: paths,
      });
      if (error) throw error;
      toast.success("Signalement envoyé à l’équipe de modération.");
      setReportOpen(false); setReportText(""); setReportPhotos([]);
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’envoyer le signalement.");
    } finally {
      setSendingReport(false);
    }
  };

  if (profile.isLoading) return <p className="py-12 text-center text-sm text-muted-foreground">Chargement du profil…</p>;
  if (profile.error || !profile.data) return <div className="space-y-4"><Link to="/community" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour à la communauté</Link><p className="rounded-2xl border p-5 text-sm text-muted-foreground">Ce profil est introuvable.</p></div>;

  const person = profile.data;
  return <div className="space-y-5">
    <Link to="/community" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour à la communauté</Link>
    <ProfileBanner src={person.banner_url} />
    <header className="relative -mt-20 flex items-center gap-4 rounded-2xl border bg-card/90 p-4 backdrop-blur">
      <AvatarZoom src={person.avatar_url} alt={`Photo de ${person.username}`} className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
        {person.avatar_url ? <img src={person.avatar_url} alt={`Photo de ${person.username}`} className="h-full w-full object-cover" /> : person.username?.[0]?.toUpperCase() ?? "?"}
      </AvatarZoom>
      <div className="min-w-0 flex-1">
        <h1 className="break-words text-xl font-black">{person.username}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Membre depuis le {new Date(person.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="mt-1 text-xs text-muted-foreground">{comments.data?.comments.length ?? 0}{comments.data && comments.data.comments.length === 50 ? "+" : ""} commentaires récents</p>
      </div>
      {user?.id !== id && <Button variant="outline" size="sm" className="shrink-0 rounded-xl" onClick={() => setReportOpen((open) => !open)}><Flag className="mr-1.5 h-4 w-4" /> Signaler</Button>}
    </header>

    {reportOpen && <section className="space-y-3 rounded-2xl border border-destructive/30 bg-card p-4">
      <div className="flex items-center justify-between"><h2 className="font-bold">Signaler ce compte</h2><button type="button" onClick={() => setReportOpen(false)} aria-label="Fermer"><X className="h-4 w-4" /></button></div>
      <p className="text-xs text-muted-foreground">Décris le problème. Tu peux joindre deux photos maximum ; le signalement sera transmis à la modération.</p>
      <textarea value={reportText} onChange={(event) => setReportText(event.target.value)} maxLength={2000} rows={4} placeholder="Motif du signalement…" className="w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <label className="block text-sm font-semibold">Photos (facultatif, 2 maximum)
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-2 block w-full text-xs" disabled={sendingReport} onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 2) toast.error("Tu peux joindre deux photos maximum.");
          setReportPhotos(files.slice(0, 2));
          event.currentTarget.value = "";
        }} />
      </label>
      {reportPhotos.length > 0 && <p className="text-xs text-muted-foreground">{reportPhotos.length} photo(s) sélectionnée(s)</p>}
      <Button className="w-full rounded-xl" disabled={sendingReport || reportText.trim().length < 3} onClick={() => void submitReport()}>{sendingReport ? "Envoi du signalement…" : "Envoyer le signalement"}</Button>
    </section>}

    <section className="grid grid-cols-3 gap-2">
      <div className="rounded-xl border bg-card p-3"><p className="text-xl font-black tabular-nums">{drinksQuery.isLoading ? "…" : drinks}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Drinks</p></div>
      <div className="rounded-xl border bg-card p-3"><p className="text-xl font-black tabular-nums">{ownedQuery.isLoading ? "…" : ownedIds.size}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Canettes différentes</p></div>
      <div className="rounded-xl border bg-card p-3"><p className="text-xl font-black tabular-nums">{ownedQuery.isLoading ? "…" : totalCans}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Canettes au total</p></div>
    </section>

    <Button type="button" onClick={() => setWallOpen((open) => !open)} className="relative h-12 w-full overflow-hidden rounded-xl border-0 bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-amber-300 font-black text-slate-950 shadow-[0_0_22px_rgba(217,70,239,0.28)] transition hover:scale-[1.01] hover:shadow-[0_0_32px_rgba(34,211,238,0.4)]">
      <Sparkles className="mr-2 h-4 w-4" /> {wallOpen ? "Masquer son mur" : `Voir le mur de ${person.username}`} <span className="ml-2">✦</span>
    </Button>
    {wallOpen && <section className="space-y-3 rounded-2xl border bg-card p-4">
      <div><h2 className="font-bold">Son mur</h2><p className="text-xs text-muted-foreground">{wallCans.length} canettes collectionnées</p></div>
      {ownedQuery.isLoading || !catalog ? <p className="text-sm text-muted-foreground">Chargement du mur…</p>
        : !wallCans.length ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Ce mur est encore vide.</p>
        : <div className="grid grid-cols-3 gap-3">{wallCans.map((can) => <Link key={can.id} to="/cans/$id" params={{ id: can.id }} className="rounded-xl border p-2 transition hover:border-primary" style={{ backgroundColor: pastelCanColor(can.color_primary) }}><div className="mx-auto aspect-[2/3] max-w-20"><CanArt can={can} brandName={catalog.brands.find((brand) => brand.id === can.brand_id)?.name} /></div><p className="mt-2 line-clamp-2 text-center text-xs font-semibold">{can.name}</p></Link>)}</div>}
    </section>}

    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <div><h2 className="font-bold">Succès débloqués</h2><p className="text-xs text-muted-foreground">{achievements.filter((a) => a.earned).length}/{achievements.length} succès</p></div>
      {!catalog || ownedQuery.isLoading ? <p className="text-sm text-muted-foreground">Chargement des succès…</p> : <div className="grid grid-cols-2 gap-2">{achievements.map((a) => <div key={a.id} className={`rounded-xl border p-3 ${a.earned ? "bg-background" : "opacity-35 grayscale"}`}><span className="text-xl">{a.icon}</span><p className="mt-1 text-xs font-bold">{a.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{a.description}</p></div>)}</div>}
    </section>

    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <div><h2 className="font-bold">Progression par marque</h2><p className="text-xs text-muted-foreground">Sa progression dans chaque collection</p></div>
      {!catalog || ownedQuery.isLoading ? <p className="text-sm text-muted-foreground">Chargement de la progression…</p> : <div className="space-y-4">{brandProgress.map((brand) => <ProgressBar key={brand.id} label={brand.name} value={brand.have} total={brand.total} color={brand.color} />)}</div>}
    </section>

    <section className="space-y-3">
      <div><h2 className="font-bold">Ses commentaires</h2><p className="mt-1 text-xs text-muted-foreground">Ses échanges publics sur les fiches de canettes.</p></div>
      {comments.isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Chargement des commentaires…</p>
        : comments.error ? <p className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">Impossible de charger les commentaires.</p>
        : !comments.data?.comments.length ? <div className="rounded-2xl border border-dashed p-6 text-center"><MessageCircle className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">Pas encore de commentaire</p></div>
        : <div className="space-y-3">{comments.data.comments.map((comment) => {
          const can = canMap.get(comment.can_id);
          return <article key={comment.id} className="rounded-2xl border p-4" style={{ backgroundColor: pastelCanColor(can?.color_primary) }}>
            {comment.body?.trim() && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{comment.body}</p>}
            {comment.image_url && <a href={comment.image_url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl border bg-muted"><img src={comment.image_url} alt={can ? `Photo partagée sur ${can.name}` : "Photo partagée"} loading="lazy" className="max-h-80 w-full object-contain" /></a>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{new Date(comment.created_at).toLocaleDateString("fr-FR")}</span>
              {can ? <Link to="/cans/$id" params={{ id: can.id }} className="font-semibold text-primary hover:underline">Sur {can.name} →</Link> : <span>Canette</span>}
            </div>
          </article>;
        })}</div>}
    </section>
  </div>;
}
