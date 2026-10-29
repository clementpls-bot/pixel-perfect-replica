import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Flag, Sparkles, Trophy, Wine, Package, ImagePlus, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCatalog } from "@/lib/data";
import { computeAchievements } from "@/lib/achievements";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/users/$username")({
  head: () => ({ meta: [
    { title: "Profil collectionneur — Cansdex" },
    { name: "description", content: "Découvre la collection, les succès et le mur d’un collectionneur Cansdex." },
  ] }),
  component: PublicProfile,
});

type PublicProfileRow = { id: string; username: string; avatar_url: string | null; created_at: string };
type OwnedRow = { can_id: string; quantity: number };
type DrinkRow = { can_id: string; drinks_count: number };

function PublicProfile() {
  const { username } = useParams({ from: "/users/$username" });
  const { user } = useAuth();
  const { data: catalog } = useCatalog();
  const [showWall, setShowWall] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [sendingReport, setSendingReport] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,username,avatar_url,created_at").eq("username", username).maybeSingle();
      if (error) throw error;
      return data as PublicProfileRow | null;
    },
  });
  const profile = profileQuery.data;

  const ownedQuery = useQuery({
    queryKey: ["public-profile-owned", profile?.id],
    enabled: !!profile?.id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_cans").select("can_id,quantity").eq("user_id", profile!.id);
      if (error) throw error;
      return (data ?? []) as OwnedRow[];
    },
  });
  const drinksQuery = useQuery({
    queryKey: ["public-profile-drinks", profile?.id],
    enabled: !!profile?.id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_can_drinks").select("can_id,drinks_count").eq("user_id", profile!.id);
      if (error) throw error;
      return (data ?? []) as DrinkRow[];
    },
  });
  const galleryQuery = useQuery({
    queryKey: ["public-profile-gallery", profile?.id],
    enabled: !!profile?.id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profile_gallery").select("id,image_url").eq("user_id", profile!.id).order("created_at", { ascending: false }).limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectReportFiles = (list: FileList | null) => {
    const selected = Array.from(list ?? []).slice(0, 2);
    for (const file of selected) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Les pièces jointes doivent être en JPG, PNG ou WebP."); return; }
      if (file.size > 5 * 1024 * 1024) { toast.error("Chaque photo doit faire 5 Mo maximum."); return; }
    }
    setReportFiles(selected);
  };

  const submitReport = async () => {
    if (!user || !profile) { toast.error("Connecte-toi pour signaler un compte."); return; }
    const details = reportText.trim();
    if (details.length < 5) { toast.error("Décris le problème en au moins 5 caractères."); return; }
    if (user.id === profile.id) { toast.error("Tu ne peux pas signaler ton propre compte."); return; }
    setSendingReport(true);
    const uploadedPaths: string[] = [];
    try {
      for (const [index, file] of reportFiles.entries()) {
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${user.id}/${crypto.randomUUID()}-${index + 1}.${ext}`;
        const { error } = await supabase.storage.from("account-report-images").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        uploadedPaths.push(path);
      }
      const { error } = await supabase.from("account_reports" as any).insert({
        reporter_user_id: user.id,
        reported_user_id: profile.id,
        details,
        image_urls: uploadedPaths,
      });
      if (error) throw error;
      setReportText(""); setReportFiles([]); setReportOpen(false);
      toast.success("Signalement transmis à la modération.");
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from("account-report-images").remove(uploadedPaths);
      toast.error((error as Error).message || "Impossible d’envoyer le signalement.");
    } finally { setSendingReport(false); }
  };

  if (profileQuery.isLoading) return <div className="py-16 text-center text-sm text-muted-foreground">Chargement du profil…</div>;
  if (profileQuery.error) return <div className="rounded-2xl border p-6 text-sm text-destructive">Impossible de charger ce profil.</div>;
  if (!profile) return <div className="py-16 text-center"><h1 className="text-2xl font-black">Profil introuvable</h1><p className="mt-2 text-sm text-muted-foreground">Ce nom d’utilisateur n’existe pas ou n’est plus disponible.</p><Link to="/community" className="mt-4 inline-block text-sm font-semibold text-primary">Retour à la communauté</Link></div>;
  if (!catalog || (user && (ownedQuery.isLoading || drinksQuery.isLoading))) return <div className="py-16 text-center text-sm text-muted-foreground">Chargement de la collection…</div>;

  const ownedRows = ownedQuery.data ?? [];
  const ownedIds = new Set(ownedRows.map((row) => row.can_id));
  const totalCans = ownedRows.reduce((sum, row) => sum + Math.max(1, row.quantity ?? 1), 0);
  const drinksByCan = new Map((drinksQuery.data ?? []).map((row) => [row.can_id, row.drinks_count] as const));
  const drinks = [...ownedIds].reduce((sum, canId) => sum + Math.max(1, drinksByCan.get(canId) ?? 1), 0);
  const achievements = computeAchievements({ ownedCanIds: ownedIds, cans: catalog.cans, brands: catalog.brands });
  const brandStats = catalog.brands.map((brand) => {
    const cans = catalog.cans.filter((can) => can.brand_id === brand.id);
    return { ...brand, total: cans.length, have: cans.filter((can) => ownedIds.has(can.id)).length };
  }).filter((brand) => brand.total > 0).sort((a, b) => (b.total ? b.have / b.total : 0) - (a.total ? a.have / a.total : 0));
  const wallCans = catalog.cans.filter((can) => ownedIds.has(can.id));
  const canBrand = (brandId: string) => catalog.brands.find((brand) => brand.id === brandId);

  return <main className="profile-page mx-auto w-full max-w-4xl space-y-5 pb-8">
    <header className="flex flex-wrap items-center gap-4 rounded-3xl border bg-card p-5">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
        {profile.avatar_url ? <img src={profile.avatar_url} alt={`Photo de ${profile.username}`} className="h-full w-full object-cover" /> : profile.username[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-widest text-primary">Collectionneur Cansdex</p><h1 className="break-words text-2xl font-black">{profile.username}</h1><p className="mt-1 text-xs text-muted-foreground">Membre depuis {new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p></div>
      {user && user.id !== profile.id && <Button type="button" variant="outline" className="rounded-xl" onClick={() => setReportOpen((open) => !open)}><Flag className="mr-2 h-4 w-4" />Signaler</Button>}
    </header>

    {reportOpen && <section className="space-y-3 rounded-2xl border border-destructive/20 bg-card p-4">
      <div><h2 className="font-bold">Signaler ce compte</h2><p className="text-xs text-muted-foreground">Explique le problème à la modération. Tu peux joindre deux photos maximum ; elles ne seront visibles que par les administrateurs.</p></div>
      <textarea value={reportText} onChange={(event) => setReportText(event.target.value)} maxLength={2000} rows={4} placeholder="Décris le motif du signalement…" className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
      <label className="block space-y-1 text-sm font-medium">Photos facultatives (2 maximum)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectReportFiles(event.target.files)} className="mt-1 block w-full text-xs text-muted-foreground" /></label>
      {reportFiles.length > 0 && <ul className="space-y-1 text-xs text-muted-foreground">{reportFiles.map((file) => <li key={file.name} className="truncate">{file.name}</li>)}</ul>}
      <div className="flex flex-wrap gap-2"><Button type="button" disabled={sendingReport} onClick={() => void submitReport()}>{sendingReport ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}Envoyer le signalement</Button><Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>Annuler</Button></div>
    </section>}

    {!user && <p className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">Connecte-toi pour consulter les détails de la collection et son mur.</p>}
    <section className="grid grid-cols-3 gap-2">
      <div className="rounded-2xl border bg-card p-3"><Package className="mb-2 h-4 w-4 text-primary" /><p className="font-display text-xl font-black tabular-nums">{ownedIds.size}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Canettes différentes</p></div>
      <div className="rounded-2xl border bg-card p-3"><Package className="mb-2 h-4 w-4 text-primary" /><p className="font-display text-xl font-black tabular-nums">{totalCans}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Exemplaires</p></div>
      <div className="rounded-2xl border bg-card p-3"><Wine className="mb-2 h-4 w-4 text-primary" /><p className="font-display text-xl font-black tabular-nums">{drinks}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Drinks</p></div>
    </section>

    <section className="rounded-2xl border bg-card px-4">
      <div className="flex items-center gap-2 py-4"><Trophy className="h-5 w-5 text-primary" /><div><h2 className="font-bold">Succès</h2><p className="text-xs text-muted-foreground">{achievements.filter((item) => item.earned).length}/{achievements.length} débloqués</p></div></div>
      <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3">{achievements.map((item) => <div key={item.id} className={`rounded-xl border p-3 ${item.earned ? "border-amber-400/50 bg-background" : "opacity-40 grayscale"}`}><span className="text-2xl">{item.icon}</span><p className="mt-1 text-sm font-bold">{item.title}</p><p className="text-xs text-muted-foreground">{item.description}</p></div>)}</div>
    </section>

    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-4 font-bold">Progression par marque</h2>
      <div className="space-y-4">{brandStats.map((brand) => <ProgressBar key={brand.id} label={brand.name} value={brand.have} total={brand.total} color={brand.color} />)}</div>
    </section>

    <section className="space-y-3">
      <Button type="button" onClick={() => setShowWall((visible) => !visible)} className="h-14 w-full rounded-2xl border-0 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 font-black text-white shadow-[0_0_24px_rgba(168,85,247,0.24)] transition hover:scale-[1.01] hover:shadow-[0_0_32px_rgba(34,211,238,0.3)]"><Sparkles className="mr-2 h-5 w-5" />{showWall ? "Masquer le mur" : `Mur de ${profile.username}`}<Sparkles className="ml-2 h-4 w-4" /></Button>
      {showWall && <div className="space-y-4 rounded-2xl border bg-card p-4">
        <div><h2 className="font-bold">Mur de collection</h2><p className="text-xs text-muted-foreground">Les canettes débloquées par ce collectionneur.</p></div>
        {wallCans.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{wallCans.map((can) => <Link key={can.id} to="/cans/$id" params={{ id: can.id }} className="rounded-xl border bg-background p-3 transition hover:border-primary/50"><div className="mx-auto h-36 w-full"><img src={can.image_url ?? ""} alt={can.name} loading="lazy" className="h-full w-full object-contain" /></div><p className="mt-2 line-clamp-2 text-sm font-bold">{can.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{canBrand(can.brand_id)?.name ?? "Marque"}</p></Link>)}</div> : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"><ImagePlus className="mx-auto mb-2 h-6 w-6" />Le mur est vide pour le moment.</div>}
      </div>}
    </section>

    {galleryQuery.data && galleryQuery.data.length > 0 && <section className="rounded-2xl border bg-card p-4"><h2 className="mb-3 font-bold">Galerie de {profile.username}</h2><div className="grid grid-cols-3 gap-2">{galleryQuery.data.map((photo) => <img key={photo.id} src={photo.image_url} alt={`Photo de la collection de ${profile.username}`} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />)}</div></section>}
    <div className="text-center"><Link to="/community" className="text-sm font-semibold text-primary hover:underline">← Retour à la communauté</Link></div>
  </main>;
}
