import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/users/$id")({
  head: () => ({ meta: [
    { title: "Profil collectionneur — Cansdex" },
    { name: "description", content: "Découvre les commentaires et les échanges d’un collectionneur Cansdex." },
  ] }),
  component: PublicUserProfile,
});

type PublicProfile = { id: string; username: string; avatar_url: string | null; created_at: string };
type UserComment = { id: string; can_id: string; body: string | null; image_url: string | null; parent_id: string | null; created_at: string };
type CanSummary = { id: string; name: string; image_url: string | null };

function PublicUserProfile() {
  const { id } = Route.useParams();
  const profile = useQuery({
    queryKey: ["public-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,username,avatar_url,created_at").eq("id", id).maybeSingle();
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
      const { data: cans, error: cansError } = await supabase.from("cans").select("id,name,image_url").in("id", canIds);
      if (cansError) throw cansError;
      return { comments: rows, cans: (cans ?? []) as CanSummary[] };
    },
  });
  const canMap = new Map((comments.data?.cans ?? []).map((can) => [can.id, can]));

  if (profile.isLoading) return <p className="py-12 text-center text-sm text-muted-foreground">Chargement du profil…</p>;
  if (profile.error || !profile.data) return <div className="space-y-4"><Link to="/community" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour à la communauté</Link><p className="rounded-2xl border p-5 text-sm text-muted-foreground">Ce profil est introuvable.</p></div>;

  const person = profile.data;
  return <div className="space-y-5">
    <Link to="/community" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour à la communauté</Link>
    <header className="flex items-center gap-4 rounded-2xl border bg-card p-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
        {person.avatar_url ? <img src={person.avatar_url} alt={`Photo de ${person.username}`} className="h-full w-full object-cover" /> : person.username?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="min-w-0">
        <h1 className="break-words text-xl font-black">{person.username}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Membre depuis le {new Date(person.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="mt-1 text-xs text-muted-foreground">{comments.data?.comments.length ?? 0}{comments.data && comments.data.comments.length === 50 ? "+" : ""} commentaires récents</p>
      </div>
    </header>
    <section className="space-y-3">
      <div><h2 className="font-bold">Ses commentaires</h2><p className="mt-1 text-xs text-muted-foreground">Ses échanges publics sur les fiches de canettes.</p></div>
      {comments.isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Chargement des commentaires…</p>
        : comments.error ? <p className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">Impossible de charger les commentaires.</p>
        : !comments.data?.comments.length ? <div className="rounded-2xl border border-dashed p-6 text-center"><MessageCircle className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">Pas encore de commentaire</p></div>
        : <div className="space-y-3">{comments.data.comments.map((comment) => {
          const can = canMap.get(comment.can_id);
          return <article key={comment.id} className="rounded-2xl border bg-card p-4">
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
