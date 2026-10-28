import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ImagePlus, MessageCircle, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Vote = { user_id: string; vote: number };
type CommunityComment = {
  id: string; can_id: string; body: string | null; image_url: string | null;
  parent_id: string | null; user_id: string; created_at: string;
  profiles: { username: string } | null; comment_likes: Vote[];
};

function voteCounts(comment: CommunityComment) {
  return comment.comment_likes.reduce((result, vote) => {
    if (vote.vote === -1) result.down += 1;
    else result.up += 1;
    return result;
  }, { up: 0, down: 0 });
}

export function CanCommunity({ canId, canName }: { canId: string; canName: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const photoPreview = useMemo(() => photo ? URL.createObjectURL(photo) : null, [photo]);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: comments = [], isLoading, error } = useQuery({
    queryKey: ["comments", canId],
    queryFn: async () => {
      const { data, error } = await supabase.from("comments")
        .select("id,can_id,body,image_url,parent_id,user_id,created_at,profiles(username),comment_likes(user_id,vote)")
        .eq("can_id", canId).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CommunityComment[];
    },
  });
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["comments", canId] }),
    qc.invalidateQueries({ queryKey: ["community-feed"] }),
  ]);

  const post = async () => {
    if (!user) { toast("Connecte-toi pour participer à la communauté."); return; }
    if (!body.trim() && !photo) { toast.error("Ajoute un commentaire ou une photo."); return; }
    setPosting(true);
    let tempImagePath: string | null = null;
    try {
      // Store selected photos privately first; they stay inaccessible to the public until approved.
      if (photo) {
        const extension = photo.type === "image/jpeg" ? "jpg" : photo.type === "image/png" ? "png" : "webp";
        tempImagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: tempUploadError } = await supabase.storage.from("community-moderation-temp").upload(tempImagePath, photo, {
          contentType: photo.type,
          upsert: false,
        });
        if (tempUploadError) throw new Error("La photo n’a pas pu être envoyée au contrôle de sécurité.");
      }

      const { data: publication, error: publishError } = await supabase.functions.invoke("publish-community-post", {
        body: { canId, parentId: replyTo, text: body.trim(), tempImagePath },
      });
      if (tempImagePath) await supabase.storage.from("community-moderation-temp").remove([tempImagePath]);
      if (publishError) {
        throw new Error("Le contrôle de sécurité ou l’enregistrement a échoué. Rien n’a été publié. Réessaie plus tard.");
      }
      if (!publication?.published) {
        toast.error(publication?.message ?? "Cette publication doit être modifiée avant de pouvoir être publiée.");
        return;
      }

      setBody(""); setPhoto(null); setReplyTo(null);
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
      toast.success("Publication ajoutée à cette canette.");
    } catch (e) {
      if (tempImagePath) await supabase.storage.from("community-moderation-temp").remove([tempImagePath]);
      toast.error((e as Error).message || "Impossible de publier. Réessaie.");
    } finally { setPosting(false); }
  };

  const vote = async (comment: CommunityComment, value: 1 | -1) => {
    if (!user) { toast("Connecte-toi pour voter."); return; }
    const current = comment.comment_likes.find((item) => item.user_id === user.id);
    let result;
    if (current?.vote === value) {
      result = await supabase.from("comment_likes").delete().eq("comment_id", comment.id).eq("user_id", user.id);
    } else if (current) {
      result = await supabase.from("comment_likes").update({ vote: value }).eq("comment_id", comment.id).eq("user_id", user.id);
    } else {
      result = await supabase.from("comment_likes").insert({ comment_id: comment.id, user_id: user.id, vote: value });
    }
    if (result.error) toast.error(result.error.message);
    else await refresh();
  };

  const Item = ({ comment, nested = false }: { comment: CommunityComment; nested?: boolean }) => {
    const counts = voteCounts(comment);
    const ownVote = comment.comment_likes.find((item) => item.user_id === user?.id)?.vote;
    return <article className={nested ? "ml-4 border-l-2 pl-3 sm:ml-7" : ""}>
      <div className="rounded-2xl border bg-card p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to="/users/$id" params={{ id: comment.user_id }} className="block truncate text-sm font-bold hover:text-primary hover:underline">{comment.profiles?.username ?? "Collectionneur"}</Link>
            <p className="text-[11px] text-muted-foreground">{new Date(comment.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          {comment.parent_id && <span className="text-[10px] text-muted-foreground">Réponse</span>}
        </div>
        {comment.body?.trim() && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{comment.body}</p>}
        {comment.image_url && <a href={comment.image_url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl border bg-muted">
          <img src={comment.image_url} alt={`Photo partagée sur ${canName}`} loading="lazy" className="max-h-[420px] w-full object-contain" />
        </a>}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-2.5">
          <button type="button" onClick={() => void vote(comment, 1)} aria-label="Vote positif" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${ownVote === 1 ? "bg-emerald-500/15 text-emerald-700" : "text-muted-foreground hover:bg-muted"}`}><ThumbsUp className="h-3.5 w-3.5" /> {counts.up}</button>
          <button type="button" onClick={() => void vote(comment, -1)} aria-label="Vote négatif" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${ownVote === -1 ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-muted"}`}><ThumbsDown className="h-3.5 w-3.5" /> {counts.down}</button>
          {!nested && user && <button type="button" onClick={() => setReplyTo(comment.id)} className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground">Répondre</button>}
        </div>
      </div>
    </article>;
  };

  const roots = comments.filter((comment) => !comment.parent_id);
  return <section className="mt-8" id="communaute-canette">
    <div className="mb-3 flex items-center justify-between gap-2">
      <div><h2 className="font-display text-lg font-bold">Espace de la canette</h2><p className="mt-0.5 text-xs text-muted-foreground">Photos, avis et échanges autour de ce design uniquement.</p></div>
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold tabular-nums">{comments.length}</span>
    </div>
    {user ? <div className="mb-4 rounded-2xl border bg-card p-3">
      {replyTo && <div className="mb-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs"><span>Tu réponds à un commentaire</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Annuler la réponse"><X className="h-4 w-4" /></button></div>}
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Un mot sur ${canName}… (facultatif si tu ajoutes une photo)`} maxLength={1000} className="min-h-20 resize-y rounded-xl border-0 bg-muted/50 focus-visible:ring-1" />
      {photo && <div className="mt-3 flex items-center gap-3 rounded-xl border p-2"><img src={photoPreview ?? undefined} alt="Aperçu de la photo" className="h-16 w-16 rounded-lg object-cover" /><p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{photo.name}</p><button type="button" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Retirer la photo"><X className="h-4 w-4" /></button></div>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choisir une photo" onChange={(e) => {
          const file = e.target.files?.[0] ?? null; if (!file) return;
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) { toast.error("Choisis une photo JPG, PNG ou WebP de 8 Mo maximum."); e.target.value = ""; return; }
          setPhoto(file);
        }} />
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="rounded-xl"><ImagePlus className="mr-2 h-4 w-4" /> Photo</Button>
        <Button type="button" onClick={() => void post()} disabled={posting || (!body.trim() && !photo)} className="rounded-xl font-bold">{posting ? "Publication…" : "Publier"}</Button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Chaque publication reste liée à cette canette. Le texte et la photo sont contrôlés automatiquement avant publication.</p>
    </div> : <Link to="/auth" className="mb-4 block rounded-xl border p-3 text-sm text-primary">Connecte-toi pour publier une photo, commenter ou voter.</Link>}
    {isLoading ? <p className="py-5 text-center text-sm text-muted-foreground">Chargement des échanges…</p>
      : error ? <p className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">Impossible de charger les commentaires.</p>
      : roots.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-center"><MessageCircle className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">Pas encore de publication</p><p className="mt-1 text-xs text-muted-foreground">Partage la première photo ou le premier avis sur cette canette.</p></div>
      : <div className="space-y-3">{roots.map((comment) => <div key={comment.id} className="space-y-2"><Item comment={comment} />{comments.filter((reply) => reply.parent_id === comment.id).map((reply) => <Item key={reply.id} comment={reply} nested />)}</div>)}</div>}
  </section>;
}
