import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Clock3, LogOut, Pencil, Star, Upload, X } from "lucide-react";
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
      { title: "Profile — Cansdex" },
      { name: "description", content: "Your collector stats and achievements." },
      { property: "og:title", content: "Profile — Cansdex" },
      { property: "og:description", content: "Your collector stats and achievements." },
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
  const [selectedFavorites, setSelectedFavorites] = useState<string[]>([]);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingFavorites, setSavingFavorites] = useState(false);
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
      setSelectedFavorites((profile.favorite_can_ids ?? []).slice(0, 3));
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

  const ownedCans = useMemo(() => {
    if (!data || !owned) return [];
    return data.cans.filter((can) => owned.has(can.id));
  }, [data, owned]);

  if (!data || !owned || profileLoading) return null;

  const ownedSet = new Set(owned.keys());
  const totalCopies = [...owned.values()].reduce((a, b) => a + b, 0);
  const brandStats = data.brands.map((b) => {
    const list = data.cans.filter((c) => c.brand_id === b.id);
    return { ...b, total: list.length, have: list.filter((c) => ownedSet.has(c.id)).length,
      copies: list.reduce((s, c) => s + (owned.get(c.id) ?? 0), 0) };
  });
  const fav = [...brandStats].sort((a, b) => b.copies - a.copies)[0];
  const achievements = computeAchievements({ ownedCanIds: ownedSet, cans: data.cans, brands: data.brands });
  const favoriteCans = (profile?.favorite_can_ids ?? [])
    .map((id: string) => data.cans.find((can) => can.id === id))
    .filter((can): can is NonNullable<typeof can> => !!can);
  const brandName = (id: string) => data.brands.find((b) => b.id === id)?.name ?? "";

  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const saveUsername = async () => {
    const next = usernameDraft.trim();
    if (!USERNAME_RULE.test(next)) {
      toast.error("Use 3–24 characters: letters, numbers, dots, dashes or underscores.");
      return;
    }
    if (next.toLowerCase() === profile?.username?.toLowerCase()) {
      setEditing(false);
      return;
    }
    if (!canChangeUsername) {
      toast.error(`You can change your username again on ${nextUsernameDate}.`);
      return;
    }
    setSavingUsername(true);
    try {
      const { error } = await supabase.from("profiles").update({ username: next }).eq("id", user!.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Username updated.");
      setEditing(false);
    } catch (error) {
      toast.error((error as Error).message || "Unable to update username.");
    } finally {
      setSavingUsername(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file || !user) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Your profile picture must be 5 MB or smaller.");
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
      toast.success("Profile picture updated.");
    } catch (error) {
      toast.error((error as Error).message || "Unable to upload profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleFavorite = (canId: string) => {
    setSelectedFavorites((current) => current.includes(canId)
      ? current.filter((id) => id !== canId)
      : current.length < 3 ? [...current, canId] : current);
  };

  const saveFavorites = async () => {
    if (!user) return;
    setSavingFavorites(true);
    try {
      const { error } = await supabase.from("profiles")
        .update({ favorite_can_ids: selectedFavorites }).eq("id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Favourite cans saved.");
    } catch (error) {
      toast.error((error as Error).message || "Unable to save favourite cans.");
    } finally {
      setSavingFavorites(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <label className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-primary font-display text-2xl font-black text-primary-foreground">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="Profile picture" className="h-full w-full object-cover" />
            : profile?.username?.[0]?.toUpperCase()}
          <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition group-hover:opacity-100">
            {uploadingAvatar ? <span className="text-xs">Uploading…</span> : <Camera className="h-5 w-5" />}
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
                maxLength={24} autoComplete="nickname" aria-label="New username"
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex gap-2">
                <Button size="sm" className="rounded-lg" disabled={savingUsername} onClick={() => void saveUsername()}>
                  <Check className="mr-1 h-4 w-4" /> Save
                </Button>
                <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => {
                  setUsernameDraft(profile?.username ?? "");
                  setEditing(false);
                }}><X className="mr-1 h-4 w-4" /> Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="break-words text-xl font-black">{profile?.username}</h1>
              <button className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                onClick={() => {
                  if (!canChangeUsername) {
                    toast.info(`Your next username change is available ${nextUsernameDate}.`);
                    return;
                  }
                  setEditing(true);
                }}>
                <Pencil className="h-3 w-3" /> Change username
              </button>
              {!canChangeUsername && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock3 className="h-3 w-3" /> Next change: {nextUsernameDate}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Collector since {profile && new Date(profile.created_at).toLocaleDateString()}</p>
            </>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out"><LogOut /></Button>
      </header>
      <p className="text-xs text-muted-foreground">Click your profile picture to upload a new one. JPG, PNG or WebP · max 5 MB.</p>

      {user?.app_metadata?.role === "admin" && (
        <Link to="/admin-submissions" className="block rounded-2xl border bg-card p-4 text-sm font-bold transition hover:border-primary">Review community can submissions →</Link>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Unique cans", ownedSet.size],
          ["Copies", totalCopies],
          ["Brands", new Set(data.cans.filter((can) => ownedSet.has(can.id)).map((can) => can.brand_id)).size],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card p-3 text-center">
            <p className="font-display text-2xl font-black tabular-nums">{value}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-bold">Favourite cans overlay</h2>
          <p className="mt-1 text-xs text-muted-foreground">Choose up to 3 cans from your collection to feature on your profile.</p>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950 p-4 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative flex min-h-36 items-center justify-between gap-2">
            <div className="max-w-[58%]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-300">Collector's picks</p>
              <p className="mt-2 text-xl font-black leading-tight">{profile?.username ?? "Your profile"}</p>
              <p className="mt-1 text-xs text-white/60">{favoriteCans.length} / 3 featured cans</p>
            </div>
            <div className="flex min-w-0 flex-1 items-end justify-end -space-x-3">
              {favoriteCans.map((can, index) => (
                <div key={can.id} className="relative w-12 shrink-0 transition-transform hover:-translate-y-2"
                  style={{ zIndex: index + 1, transform: `rotate(${(index - (favoriteCans.length - 1) / 2) * 8}deg)` }}>
                  <CanArt can={can} brandName={brandName(can.brand_id)} className="max-h-28 drop-shadow-xl" />
                </div>
              ))}
              {favoriteCans.length === 0 && <Star className="mr-2 h-12 w-12 text-orange-300/70" />}
            </div>
          </div>
          {favoriteCans.length > 0 && (
            <div className="relative mt-3 flex flex-wrap gap-1.5">
              {favoriteCans.map((can) => (
                <span key={can.id} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold">
                  {can.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {ownedCans.length === 0 ? (
            <p className="rounded-xl border p-3 text-sm text-muted-foreground">Scan a can first to choose your favourites.</p>
          ) : ownedCans.map((can) => {
            const checked = selectedFavorites.includes(can.id);
            return (
              <label key={can.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${checked ? "border-primary bg-primary/5" : "bg-card hover:border-primary/40"} ${!checked && selectedFavorites.length >= 3 ? "cursor-not-allowed opacity-50" : ""}`}>
                <input type="checkbox" checked={checked} disabled={!checked && selectedFavorites.length >= 3}
                  onChange={() => toggleFavorite(can.id)} className="h-4 w-4 accent-primary" />
                <div className="w-8 shrink-0"><CanArt can={can} brandName={brandName(can.brand_id)} className="max-h-12" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{can.name}</p>
                  <p className="text-xs text-muted-foreground">{brandName(can.brand_id)}</p>
                </div>
                {checked && <Check className="h-4 w-4 text-primary" />}
              </label>
            );
          })}
        </div>
        <Button className="w-full rounded-xl font-bold" disabled={savingFavorites || selectedFavorites.join(",") === (profile?.favorite_can_ids ?? []).join(",")}
          onClick={() => void saveFavorites()}>
          <Star className="mr-2 h-4 w-4" /> {savingFavorites ? "Saving…" : "Save favourite cans"}
        </Button>
      </section>

      {fav && fav.copies > 0 && (
        <p className="rounded-2xl border bg-card p-4 text-sm">Favourite brand: <b style={{ color: fav.color }}>{fav.name}</b></p>
      )}

      <section>
        <h2 className="mb-3 font-bold">Achievements · {achievements.filter((a) => a.earned).length}/{achievements.length}</h2>
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
        <h2 className="font-bold">Progress by brand</h2>
        {brandStats.map((b) => <ProgressBar key={b.id} label={b.name} value={b.have} total={b.total} color={b.color} />)}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">My comments</h2>
          <span className="text-xs text-muted-foreground">{comments?.length ?? 0}</span>
        </div>
        {commentsLoading ? (
          <p className="text-sm text-muted-foreground">Loading your comments…</p>
        ) : commentsError ? (
          <p className="text-sm text-destructive">Unable to load your comments.</p>
        ) : !comments?.length ? (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground">You haven't posted any comments yet.</p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => {
              const can = data.cans.find((item) => item.id === comment.can_id);
              return (
                <article key={comment.id} className="rounded-2xl border bg-card p-4">
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    {can ? <Link to="/cans/$id" params={{ id: can.id }} className="font-semibold text-primary hover:underline">On {can.name} →</Link> : <span>Can</span>}
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
