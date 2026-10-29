import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, LogOut, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCatalog, useOwned } from "@/lib/data";
import { computeAchievements } from "@/lib/achievements";
import { pastelCanColor } from "@/lib/can-colors";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Moi — Cansdex" },
      { name: "description", content: "Vos statistiques de collection et vos succès." },
      { property: "og:title", content: "Moi — Cansdex" },
      { property: "og:description", content: "Vos statistiques de collection et vos succès." },
    ],
  }),
  component: Profile,
});

const USERNAME_RULE = /^[A-Za-z0-9_.-]{3,24}$/;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function Profile() {
  const { user } = useAuth();
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<{ id: string; can_id: string; body: string | null } | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setUsernameDraft(profile.username ?? "");
    }
  }, [profile]);

  const { data: comments, isLoading: commentsLoading, error: commentsError } = useQuery({
    queryKey: ["my-comments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("comments")
        .select("id,body,image_url,created_at,can_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: drinkRows = [] } = useQuery({
    queryKey: ["profile-drinks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_can_drinks")
        .select("can_id,drinks_count")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const changedAt = (profile as { username_changed_at?: string | null } | null | undefined)?.username_changed_at;
  const canChangeUsernameAt = changedAt
    ? new Date(changedAt).getTime() + SEVEN_DAYS
    : null;
  const usernameWaitMs = canChangeUsernameAt ? Math.max(0, canChangeUsernameAt - Date.now()) : 0;
  const canChangeUsername = usernameWaitMs === 0;
  const nextUsernameDate = canChangeUsernameAt
    ? new Date(canChangeUsernameAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
    : null;

  if (!data || !owned || profileLoading) return null;

  const ownedSet = new Set(owned.keys());
  const totalExemplaires = [...owned.values()].reduce((a, b) => a + b, 0);
  const brandStats = data.brands.map((b) => {
    const list = data.cans.filter((c) => c.brand_id === b.id);
    return { ...b, total: list.length, have: list.filter((c) => ownedSet.has(c.id)).length,
      copies: list.reduce((s, c) => s + (owned.get(c.id) ?? 0), 0) };
  });
  const sortedBrandStats = [...brandStats].sort((a, b) => (b.total ? b.have / b.total : 0) - (a.total ? a.have / a.total : 0) || b.have - a.have || a.name.localeCompare(b.name, "fr"));
  const totalDrinks = drinkRows.reduce((sum, row) => sum + (row.drinks_count ?? 0), 0);
  const drinksByBrand = new Map<string, number>();
  for (const row of drinkRows) {
    const can = data.cans.find((item) => item.id === row.can_id);
    if (can) drinksByBrand.set(can.brand_id, (drinksByBrand.get(can.brand_id) ?? 0) + (row.drinks_count ?? 0));
  }
  const mostDrunkBrand = data.brands
    .map((brand) => ({ ...brand, drinks: drinksByBrand.get(brand.id) ?? 0 }))
    .sort((a, b) => b.drinks - a.drinks || a.name.localeCompare(b.name, "fr"))[0];
  const achievements = computeAchievements({ ownedCanIds: ownedSet, cans: data.cans, brands: data.brands });

  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const saveUsername = async () => {
    const next = usernameDraft.trim();
    if (!USERNAME_RULE.test(next)) {
      toast.error("Utilisez 3 à 24 caractères : lettres, chiffres, points, tirets ou tirets bas.");
      return;
    }
    if (next.toLowerCase() === profile?.username?.toLowerCase()) {
      setEditing(false);
      return;
    }
    if (!canChangeUsername) {
      toast.error(`Vous pourrez modifier votre nom d’utilisateur à nouveau le ${nextUsernameDate}.`);
      return;
    }
    setSavingUsername(true);
    try {
      const { error } = await supabase.from("profiles").update({ username: next }).eq("id", user!.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Nom d’utilisateur mis à jour.");
      setEditing(false);
    } catch (error) {
      toast.error((error as Error).message || "Impossible de mettre à jour le nom d’utilisateur.");
    } finally {
      setSavingUsername(false);
    }
  };

  const deleteComment = async () => {
    if (!user || !commentToDelete) return;
    setDeletingComment(true);
    try {
      const { error } = await supabase.from("comments")
        .delete().eq("id", commentToDelete.id).eq("user_id", user.id);
      if (error) throw error;
      const deletedCanId = commentToDelete.can_id;
      setCommentToDelete(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-comments", user.id] }),
        qc.invalidateQueries({ queryKey: ["comments", deletedCanId] }),
        qc.invalidateQueries({ queryKey: ["community-feed"] }),
      ]);
      toast.success("Commentaire supprimé.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible de supprimer ce commentaire.");
    } finally {
      setDeletingComment(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file || !user) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choisissez une image JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Votre photo de profil doit faire 5 Mo maximum.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("profile-avatars").getPublicUrl(path);
      const { error: updateError } = await supabase.from("profiles")
        .update({ avatar_url: publicUrl.publicUrl }).eq("id", user.id);
      if (updateError) throw updateError;
      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Photo de profil mise à jour.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’envoyer la photo de profil.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <label className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-primary font-display text-2xl font-black text-primary-foreground">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="Photo de profil" className="h-full w-full object-cover" />
            : profile?.username?.[0]?.toUpperCase()}
          <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition group-hover:opacity-100">
            {uploadingAvatar ? <span className="text-xs">Envoi en cours…</span> : <Camera className="h-5 w-5" />}
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
            disabled={uploadingAvatar} onChange={(event) => {
              void uploadAvatar(event.target.files?.[0]);
              event.currentTarget.value = "";
            }} />
        </label>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input value={usernameDraft} onChange={(event) => setUsernameDraft(event.target.value)}
                maxLength={24} autoComplete="nickname" aria-label="Nouveau nom d’utilisateur"
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex gap-2">
                <Button size="sm" className="rounded-lg" disabled={savingUsername} onClick={() => void saveUsername()}>
                  <Check className="mr-1 h-4 w-4" /> Enregistrer
                </Button>
                <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => {
                  setUsernameDraft(profile?.username ?? "");
                  setEditing(false);
                }}><X className="mr-1 h-4 w-4" /> Annuler</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="break-words text-xl font-black">{profile?.username}</h1>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {totalDrinks} Drinks{totalDrinks > 0 && mostDrunkBrand?.drinks ? <> <span aria-hidden="true">·</span> Plus consommée : <span className="font-semibold" style={{ color: mostDrunkBrand.color }}>{mostDrunkBrand.name}</span></> : ""}
              </p>
              <button className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                onClick={() => {
                  if (!canChangeUsername) {
                    toast.error(`Vous pourrez modifier votre nom d’utilisateur à nouveau le ${nextUsernameDate}.`);
                    return;
                  }
                  setEditing(true);
                }}>
                <Pencil className="h-3 w-3" /> Modifier le nom d’utilisateur
              </button>
            </>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={signOut} aria-label="Se déconnecter"><LogOut /></Button>
      </header>
      {user?.app_metadata?.["role"] === "admin" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Link to="/admin-cans" className="block rounded-2xl border bg-card p-4 text-sm font-bold transition hover:border-primary">Gérer le catalogue des canettes →</Link>
          <Link to="/admin-submissions" className="block rounded-2xl border bg-card p-4 text-sm font-bold transition hover:border-primary">Modérer les propositions de canettes →</Link>
          <Link to="/admin-reports" className="block rounded-2xl border bg-card p-4 text-sm font-bold transition hover:border-primary">Consulter les signalements de comptes →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card/70 px-3 py-2.5"><p className="font-display text-xl font-bold tabular-nums">{ownedSet.size}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Canettes différentes</p></div>
        <div className="rounded-xl border bg-card/70 px-3 py-2.5"><p className="font-display text-xl font-bold tabular-nums">{totalExemplaires}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Nombre de canettes</p></div>
      </div>

      <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="achievements" className="rounded-2xl border bg-card px-4">
          <AccordionTrigger className="no-underline hover:no-underline"><span className="text-left"><span className="block font-bold">Succès</span><span className="text-xs font-normal text-muted-foreground">{achievements.filter((a) => a.earned).length}/{achievements.length} débloqués</span></span></AccordionTrigger>
          <AccordionContent><div className="grid grid-cols-2 gap-3">{achievements.map((a) => <div key={a.id} className={`rounded-xl border p-3 transition ${a.earned ? "border-gold/50 bg-background" : "opacity-40 grayscale"}`}><span className="text-2xl">{a.icon}</span><p className="mt-1 text-sm font-bold">{a.title}</p><p className="text-xs text-muted-foreground">{a.description}</p></div>)}</div></AccordionContent>
        </AccordionItem>
        <AccordionItem value="brands" className="rounded-2xl border bg-card px-4">
          <AccordionTrigger className="no-underline hover:no-underline"><span className="text-left"><span className="block font-bold">Progression par marque</span><span className="text-xs font-normal text-muted-foreground">De la plus avancée à la moins avancée</span></span></AccordionTrigger>
          <AccordionContent><div className="space-y-4">{sortedBrandStats.map((b) => <ProgressBar key={b.id} label={b.name} value={b.have} total={b.total} color={b.color} />)}</div></AccordionContent>
        </AccordionItem>
      </Accordion>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">Mes commentaires</h2>
          <span className="text-xs text-muted-foreground">{comments?.length ?? 0}</span>
        </div>
        {commentsLoading ? (
          <p className="text-sm text-muted-foreground">Chargement de vos commentaires…</p>
        ) : commentsError ? (
          <p className="text-sm text-destructive">Impossible de charger vos commentaires.</p>
        ) : !comments?.length ? (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground">Vous n’avez pas encore publié de commentaires.</p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => {
              const can = data.cans.find((item) => item.id === comment.can_id);
              return (
                <article key={comment.id} className="rounded-2xl border p-4" style={{ backgroundColor: pastelCanColor(can?.color_primary) }}>
                  {comment.body?.trim() && <p className="whitespace-pre-wrap break-words text-sm">{comment.body}</p>}
                  {comment.image_url && <a href={comment.image_url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl border bg-muted"><img src={comment.image_url} alt={can ? `Photo partagée sur ${can.name}` : "Photo partagée"} loading="lazy" className="max-h-80 w-full object-contain" /></a>}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    {can ? <Link to="/cans/$id" params={{ id: can.id }} className="font-semibold text-primary hover:underline">Sur {can.name} →</Link> : <span>Canette</span>}
                    <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setCommentToDelete({ id: comment.id, can_id: comment.can_id, body: comment.body })}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <Dialog open={!!commentToDelete} onOpenChange={(open) => { if (!open && !deletingComment) setCommentToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce commentaire ?</DialogTitle>
            <DialogDescription>Cette action est définitive. Le commentaire sera retiré de l’espace communautaire.</DialogDescription>
          </DialogHeader>
          {commentToDelete?.body?.trim() && <p className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-3 text-sm">{commentToDelete.body}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCommentToDelete(null)} disabled={deletingComment}>Annuler</Button>
            <Button type="button" variant="destructive" onClick={() => void deleteComment()} disabled={deletingComment}>
              {deletingComment ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
