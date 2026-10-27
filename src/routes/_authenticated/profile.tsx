import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Clock3, LogOut, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCatalog, useOwned } from "@/lib/data";
import { computeAchievements } from "@/lib/achievements";
import { ProgressBar } from "@/components/ProgressBar";
import { CanArt } from "@/components/CanArt";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profil — Cansdex" },
      { name: "description", content: "Vos statistiques de collection et vos succès." },
      { property: "og:title", content: "Profil — Cansdex" },
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
        .select("id,body,created_at,can_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const canChangeUsernameAt = profile?.username_changed_at
    ? new Date(profile.username_changed_at).getTime() + SEVEN_DAYS
    : null;
  const usernameWaitMs = canChangeUsernameAt ? Math.max(0, canChangeUsernameAt - Date.now()) : 0;
  const canChangeUsername = usernameWaitMs === 0;
  const nextUsernameDate = canChangeUsernameAt
    ? new Date(canChangeUsernameAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  if (!data || !owned || profileLoading) return null;

  const ownedSet = new Set(owned.keys());
  const totalExemplaires = [...owned.values()].reduce((a, b) => a + b, 0);
  const brandStats = data.brands.map((b) => {
    const list = data.cans.filter((c) => c.brand_id === b.id);
    return { ...b, total: list.length, have: list.filter((c) => ownedSet.has(c.id)).length,
      copies: list.reduce((s, c) => s + (owned.get(c.id) ?? 0), 0) };
  });
  const fav = [...brandStats].sort((a, b) => b.copies - a.copies)[0];
  const achievements = computeAchievements({ ownedCanIds: ownedSet, cans: data.cans, brands: data.brands });
  const brandName = (id: string) => data.brands.find((b) => b.id === id)?.name ?? "";

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
              <button className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                onClick={() => {
                  if (!canChangeUsername) {
                    toast.info(`Vous pourrez modifier votre nom d’utilisateur à nouveau le ${nextUsernameDate}.`);
                    return;
                  }
                  setEditing(true);
                }}>
                <Pencil className="h-3 w-3" /> Modifier le nom d’utilisateur
              </button>
              {!canChangeUsername && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock3 className="h-3 w-3" /> Prochaine modification : {nextUsernameDate}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Collectionneur depuis {profile && new Date(profile.created_at).toLocaleDateString()}</p>
            </>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={signOut} aria-label="Se déconnecter"><LogOut /></Button>
      </header>
      <p className="text-xs text-muted-foreground">Cliquez sur votre photo de profil pour la remplacer. JPG, PNG ou WebP · 5 Mo maximum.</p>

      {user?.app_metadata?.role === "admin" && (
        <Link to="/admin-submissions" className="block rounded-2xl border bg-card p-4 text-sm font-bold transition hover:border-primary">Modérer les propositions de canettes →</Link>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Canettes différentes", ownedSet.size],
          ["Exemplaires", totalExemplaires],
          ["Marques", new Set(data.cans.filter((can) => ownedSet.has(can.id)).map((can) => can.brand_id)).size],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card p-3 text-center">
            <p className="font-display text-2xl font-black tabular-nums">{value}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>


      {fav && fav.copies > 0 && (
        <p className="rounded-2xl border bg-card p-4 text-sm">Marque la plus collectionnée : <b style={{ color: fav.color }}>{fav.name}</b></p>
      )}

      <section>
        <h2 className="mb-3 font-bold">Succès · {achievements.filter((a) => a.earned).length}/{achievements.length}</h2>
        <div className="grid grid-cols-2 gap-3">
          {achievements.map((a) => (
            <div key={a.id} className={`rounded-2xl border p-3 transition ${a.earned ? "border-gold/50 bg-card" : "opacity-40 grayscale"}`}>
              <span className="text-2xl">{a.icon}</span>
              <p className="mt-1 text-sm font-bold">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Progression par marque</h2>
        {brandStats.map((b) => <ProgressBar key={b.id} label={b.name} value={b.have} total={b.total} color={b.color} />)}
      </section>

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
                <article key={comment.id} className="rounded-2xl border bg-card p-4">
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    {can ? <Link to="/cans/$id" params={{ id: can.id }} className="font-semibold text-primary hover:underline">Sur {can.name} →</Link> : <span>Canette</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
