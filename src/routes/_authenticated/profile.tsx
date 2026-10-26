import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCatalog, useOwned } from "@/lib/data";
import { computeAchievements, pct } from "@/lib/achievements";
import { ProgressBar } from "@/components/ProgressBar";
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

function Profile() {
  const { user } = useAuth();
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });
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
  if (!data || !owned) return null;

  const ownedSet = new Set(owned.keys());
  const totalCopies = [...owned.values()].reduce((a, b) => a + b, 0);
  const brandStats = data.brands.map((b) => {
    const list = data.cans.filter((c) => c.brand_id === b.id);
    return { ...b, total: list.length, have: list.filter((c) => ownedSet.has(c.id)).length,
      copies: list.reduce((s, c) => s + (owned.get(c.id) ?? 0), 0) };
  });
  const fav = [...brandStats].sort((a, b) => b.copies - a.copies)[0];
  const achievements = computeAchievements({ ownedCanIds: ownedSet, cans: data.cans, brands: data.brands });

  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary font-display text-2xl font-black text-primary-foreground">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile?.username?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-black">{profile?.username}</h1>
          <p className="text-xs text-muted-foreground">Collector since {profile && new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out"><LogOut /></Button>
      </header>

      {user?.app_metadata?.role === "admin" && (
        <Link to="/admin-submissions" className="block rounded-2xl border bg-card p-4 text-sm font-bold transition hover:border-primary">Review community can submissions →</Link>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[[ "Unique", ownedSet.size ], [ "Copies", totalCopies ], [ "Complete", `${pct(ownedSet.size, data.cans.length)}%` ]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border bg-card p-3 text-center">
            <p className="font-display text-2xl font-black tabular-nums">{v}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
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
