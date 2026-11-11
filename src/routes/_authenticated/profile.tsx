import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, LogOut, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCatalog, useOwned } from "@/lib/data";
import { computeAchievements } from "@/lib/achievements";
import { pastelCanColor } from "@/lib/can-colors";
import { PROFILE_RING_COLORS, getProfileRingColor, type ProfileRingColor } from "@/lib/profile-colors";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ProgressBar";
import { CanPlaceholder } from "@/components/CanPlaceholder";
import { AvatarZoom, ProfileBanner } from "@/components/ProfileMedia";
import { FriendsHub } from "@/components/FriendSystem";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [savingRingColor, setSavingRingColor] = useState(false);
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<{ id: string; can_id: string | null; body: string | null } | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [drinksDialogOpen, setDrinksDialogOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"overview" | "activity">("overview");


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
      setDisplayNameDraft(profile.display_name ?? profile.username ?? "");
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
    if (!user) return;
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
      const { error } = await supabase.from("profiles").update({ username: next }).eq("id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Nom d’utilisateur mis à jour.");
      setEditing(false);
    } catch (error) {
      toast.error((error as Error).message || "Impossible de mettre à jour le nom d’utilisateur.");
    } finally {
      setSavingUsername(false);
    }
  };

  const saveDisplayName = async () => {
    if (!user) return;
    const next = displayNameDraft.trim();
    if (!next || next.length > 32) {
      toast.error("Le nom d’affichage doit contenir entre 1 et 32 caractères.");
      return;
    }
    setSavingDisplayName(true);
    try {
      const { error } = await supabase.from("profiles").update({ display_name: next }).eq("id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Nom d’affichage mis à jour.");
      setEditing(false);
    } catch (error) {
      toast.error((error as Error).message || "Impossible de modifier le nom d’affichage.");
    } finally {
      setSavingDisplayName(false);
    }
  };

  const saveRingColor = async (color: ProfileRingColor) => {
    if (!user || savingRingColor) return;
    setSavingRingColor(true);
    try {
      const { error } = await supabase.from("profiles").update({ avatar_ring_color: color }).eq("id", user.id);
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["profile", user.id] }),
        qc.invalidateQueries({ queryKey: ["public-profile", user.id] }),
      ]);
      toast.success("Couleur du contour enregistrée.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible de modifier la couleur.");
    } finally { setSavingRingColor(false); }
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

  const uploadImage = async (file: File | undefined, kind: "avatar" | "banner") => {
    if (!file || !user) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choisissez une image JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L’image doit faire 5 Mo maximum.");
      return;
    }
    const setBusy = kind === "avatar" ? setUploadingAvatar : setUploadingBanner;
    setBusy(true);
    try {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${user.id}/${kind}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("profile-avatars").getPublicUrl(path);
      const update = kind === "avatar" ? { avatar_url: publicUrl.publicUrl } : { banner_url: publicUrl.publicUrl };
      const { error: updateError } = await supabase.from("profiles").update(update).eq("id", user.id);
      if (updateError) throw updateError;
      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success(kind === "avatar" ? "Photo de profil mise à jour." : "Bannière mise à jour.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’envoyer l’image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-8">
      <ProfileBanner src={profile?.banner_url}>
        <label className="absolute right-3 top-3 z-10 flex cursor-pointer items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-xs font-bold shadow backdrop-blur">
          <Camera className="h-3.5 w-3.5" />{uploadingBanner ? "Envoi…" : "Bannière"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
            disabled={uploadingBanner} onChange={(event) => {
              void uploadImage(event.target.files?.[0], "banner");
              event.currentTarget.value = "";
            }} />
        </label>
      </ProfileBanner>
      <header className="relative -mt-24 flex flex-col items-center gap-3 text-center">
        <Button size="icon" variant="ghost" className="absolute right-0 top-24 rounded-full" onClick={signOut} aria-label="Se déconnecter"><LogOut /></Button>
        <div className="relative shrink-0">
          <AvatarZoom src={profile?.avatar_url} alt="Photo de profil" ringColor={profile?.avatar_ring_color} className="profile-avatar-ring flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[5px] border-background bg-pastel-yellow font-display text-5xl font-black text-foreground">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="Photo de profil" className="h-full w-full object-cover" />
              : profile?.username?.[0]?.toUpperCase()}
          </AvatarZoom>
          <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow" aria-label="Changer la photo de profil">
            {uploadingAvatar ? <span className="text-[9px]">…</span> : <Camera className="h-4 w-4" />}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
              disabled={uploadingAvatar} onChange={(event) => {
                void uploadImage(event.target.files?.[0], "avatar");
                event.currentTarget.value = "";
              }} />
          </label>
        </div>
        <div className="w-full min-w-0 space-y-2 px-4">
          <h1 className="break-words font-display text-3xl leading-tight">{profile?.display_name || profile?.username}</h1>
          <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          <Button variant="secondary" className="h-10 rounded-full px-5" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Modifier le profil
          </Button>
          <p className="text-xs text-muted-foreground">
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setDrinksDialogOpen(true)} disabled={totalDrinks === 0}>{totalDrinks} Drinks</Button>
            {totalDrinks > 0 && mostDrunkBrand?.drinks ? <> · Plus consommée : <span className="font-semibold text-foreground">{mostDrunkBrand.name}</span></> : ""}
          </p>
        </div>
        <Link to="/community" className="pill-dark mt-1 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold">Voir le classement <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">Nv {Math.floor(Math.sqrt(ownedSet.size * 10 / 50)) + 1}</span></Link>
      </header>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader className="text-left">
            <DialogTitle>Modifier le profil</DialogTitle>
            <DialogDescription>Ton identité et la couleur de ta photo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="profile-display-name" className="text-sm font-bold">Nom d’affichage</label>
              <div className="flex gap-2">
                <Input id="profile-display-name" value={displayNameDraft} onChange={(event) => setDisplayNameDraft(event.target.value)} maxLength={32} className="h-11 min-w-0 flex-1" />
                <Button size="icon" className="h-11 w-11 shrink-0" aria-label="Enregistrer le nom d’affichage" title="Enregistrer le nom d’affichage" disabled={savingDisplayName || !displayNameDraft.trim() || displayNameDraft.trim() === profile?.display_name} onClick={() => void saveDisplayName()}><Check /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="profile-username" className="text-sm font-bold">Pseudo</label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1"><span className="pointer-events-none absolute left-3 top-3 text-muted-foreground">@</span><Input id="profile-username" value={usernameDraft} onChange={(event) => setUsernameDraft(event.target.value)} maxLength={24} autoComplete="nickname" disabled={!canChangeUsername} className="h-11 pl-8" /></div>
                <Button size="icon" className="h-11 w-11 shrink-0" aria-label="Enregistrer le pseudo" title="Enregistrer le pseudo" disabled={savingUsername || !canChangeUsername || usernameDraft.trim() === profile?.username} onClick={() => void saveUsername()}><Check /></Button>
              </div>
              <p className="text-xs text-muted-foreground">{canChangeUsername ? "Modifiable une fois tous les 7 jours." : `Prochaine modification le ${nextUsernameDate}.`}</p>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold">Couleur du contour</legend>
              <div className="grid grid-cols-6 gap-3">
                {PROFILE_RING_COLORS.map((color) => <Button key={color.id} variant="ghost" size="icon" aria-label={color.label} title={color.label} aria-pressed={getProfileRingColor(profile?.avatar_ring_color) === color.id} disabled={savingRingColor} data-ring-color={color.id} onClick={() => void saveRingColor(color.id)} className="h-10 w-10 justify-self-center rounded-full border border-border p-1"><span className="profile-color-swatch grid h-full w-full place-items-center rounded-full">{getProfileRingColor(profile?.avatar_ring_color) === color.id && <Check className="h-4 w-4 text-foreground" />}</span></Button>)}
              </div>
            </fieldset>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setEditing(false)} className="rounded-full">Terminé</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <FriendsHub />
      <div className="flex border-b border-[#ececf0] gap-0">
        {([["overview", "Vue d’ensemble"], ["activity", "Activité"]] as const).map(([k, l]) => <button key={k} onClick={() => setProfileTab(k)} className={`flex-1 border-b-[3px] px-5 py-3 text-sm font-bold transition ${profileTab === k ? "border-black text-black" : "border-transparent text-muted-foreground"}`}>{l}</button>)}
      </div>
      {user?.app_metadata?.["role"] === "admin" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Link to="/admin-cans" className="block rounded-2xl border bg-card p-4 text-sm font-bold transition hover:border-primary">Gérer le catalogue des canettes →</Link>
          <Link to="/admin-submissions" className="block rounded-2xl border bg-card p-4 text-sm font-bold transition hover:border-primary">Modérer les propositions de canettes →</Link>
          <Link to="/admin-reports" className="block rounded-2xl border bg-card p-4 text-sm font-bold transition hover:border-primary">Consulter les signalements de comptes →</Link>
        </div>
      )}

      {profileTab === "overview" && <section className="space-y-3">
        <h2 className="font-display text-xl uppercase tracking-tight">Highlights</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: ownedSet.size, l: "Canettes", e: <CanPlaceholder className="h-12 w-8 text-black/70" />, c: "bg-pastel-yellow" },
            { v: totalExemplaires, l: "Exemplaires", e: "📦", c: "bg-pastel-peach" },
            { v: achievements.filter((a) => a.earned).length, l: "Succès", e: "🏆", c: "bg-pastel-sand" },
            { v: totalDrinks, l: "Drinks", e: "⚡", c: "bg-pastel-blue" },
          ].map((h) => <div key={h.l} className={`${h.c} bubble-surface relative min-h-[112px] overflow-hidden rounded-[22px] p-4`} style={{ "--bubble-color": h.l === "Canettes" ? "#b5e934" : h.l === "Drinks" ? "#4c9de8" : h.l === "Succès" ? "#d7a84b" : "#ed8d72" } as React.CSSProperties}><span className="absolute bottom-2 right-3 opacity-90">{h.e}</span><p className="relative mt-1 font-display text-3xl tabular-nums leading-none">{h.v}</p><p className="relative mt-1 text-sm font-semibold text-black/60">{h.l}</p></div>)}
        </div>
      </section>}

      {profileTab === "overview" && <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="achievements" className="rounded-2xl border bg-card px-4">
          <AccordionTrigger className="no-underline hover:no-underline"><span className="text-left"><span className="block font-bold">Succès</span><span className="text-xs font-normal text-muted-foreground">{achievements.filter((a) => a.earned).length}/{achievements.length} débloqués</span></span></AccordionTrigger>
          <AccordionContent><div className="grid grid-cols-2 gap-3">{achievements.map((a) => <div key={a.id} className={`rounded-xl border p-3 transition ${a.earned ? "border-gold/50 bg-background" : "opacity-40 grayscale"}`}><span className="text-2xl">{a.icon}</span><p className="mt-1 text-sm font-bold">{a.title}</p><p className="text-xs text-muted-foreground">{a.description}</p></div>)}</div></AccordionContent>
        </AccordionItem>
        <AccordionItem value="brands" className="rounded-2xl border bg-card px-4">
          <AccordionTrigger className="no-underline hover:no-underline"><span className="text-left"><span className="block font-bold">Progression par marque</span><span className="text-xs font-normal text-muted-foreground">De la plus avancée à la moins avancée</span></span></AccordionTrigger>
          <AccordionContent><div className="space-y-4">{sortedBrandStats.map((b) => <ProgressBar key={b.id} label={b.name} value={b.have} total={b.total} color={b.color} />)}</div></AccordionContent>
        </AccordionItem>
      </Accordion>}

      {profileTab === "activity" && <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl uppercase">Mes commentaires</h2>
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
      </section>}
      <Dialog open={drinksDialogOpen} onOpenChange={setDrinksDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mes Drinks par canette</DialogTitle>
            <DialogDescription>Appuie sur une canette pour ouvrir sa fiche et consulter son compteur.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {drinkRows
              .map((row) => {
                const can = data.cans.find((item) => item.id === row.can_id);
                const brand = data.brands.find((item) => item.id === can?.brand_id);
                return { can, brand, count: row.drinks_count ?? 0 };
              })
              .filter((item) => item.can && item.count > 0)
              .sort((a, b) => b.count - a.count || a.can!.name.localeCompare(b.can!.name, "fr"))
              .map((item) => (
                <Link
                  key={item.can!.id}
                  to="/cans/$id"
                  params={{ id: item.can!.id }}
                  className="flex items-center justify-between gap-3 rounded-xl border p-3 transition hover:border-primary hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{item.can!.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.brand?.name ?? "Marque inconnue"}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-black tabular-nums">{item.count} Drinks</span>
                </Link>
              ))}
            {totalDrinks === 0 && <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Tu n’as pas encore enregistré de Drinks.</p>}
          </div>
        </DialogContent>
      </Dialog>

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
