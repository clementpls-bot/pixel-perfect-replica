import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MessageCircle, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<CommunityComment | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

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
    if (!body.trim()) { toast.error("Écris un commentaire avant de publier."); return; }
    setPosting(true);
    try {
      const { error: insertError } = await supabase.from("comments").insert({
        can_id: canId,
        user_id: user.id,
        body: body.trim() || null,
        image_url: null,
        parent_id: replyTo,
      });
      if (insertError) throw new Error("La publication n’a pas pu être enregistrée. Vérifie les droits de publication puis réessaie.");

      setBody(""); setReplyTo(null);
      await refresh();
      toast.success("Publication ajoutée à cette canette.");
    } catch (e) {
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
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-2.5">
          <button type="button" onClick={() => void vote(comment, 1)} aria-label="Vote positif" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${ownVote === 1 ? "bg-emerald-500/15 text-emerald-700" : "text-muted-foreground hover:bg-muted"}`}><ThumbsUp className="h-3.5 w-3.5" /> {counts.up}</button>
          <button type="button" onClick={() => void vote(comment, -1)} aria-label="Vote négatif" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${ownVote === -1 ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-muted"}`}><ThumbsDown className="h-3.5 w-3.5" /> {counts.down}</button>
          {!nested && user && <button type="button" onClick={() => setReplyTo(comment.id)} className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground">Répondre</button>}
          {user?.id === comment.user_id && <button type="button" onClick={() => setCommentToDelete(comment)} title="Supprimer mon commentaire" aria-label="Supprimer mon commentaire" className="rounded-full p-1.5 text-muted-foreground/60 transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
    </article>;
  };

  const roots = comments.filter((comment) => !comment.parent_id);
  const deleteComment = async () => {
    if (!user || !commentToDelete) return;
    setDeletingComment(true);
    try {
      const { error: deleteError } = await supabase.from("comments")
        .delete().eq("id", commentToDelete.id).eq("user_id", user.id);
      if (deleteError) throw deleteError;
      setCommentToDelete(null);
      await refresh();
      toast.success("Commentaire supprimé.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible de supprimer ce commentaire.");
    } finally {
      setDeletingComment(false);
    }
  };

  return <section className="mt-8" id="communaute-canette">
    <div className="mb-3 flex items-center justify-between gap-2">
      <div><h2 className="font-display text-lg font-bold">Espace de la canette</h2><p className="mt-0.5 text-xs text-muted-foreground">Avis et échanges autour de ce design uniquement.</p></div>
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold tabular-nums">{comments.length}</span>
    </div>
    {user ? <div className="mb-4 rounded-2xl border bg-card p-3">
      {replyTo && <div className="mb-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs"><span>Tu réponds à un commentaire</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Annuler la réponse"><X className="h-4 w-4" /></button></div>}
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Un mot sur ${canName}…`} maxLength={1000} className="min-h-20 resize-y rounded-xl border-0 bg-muted/50 focus-visible:ring-1" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <Button type="button" onClick={() => void post()} disabled={posting || !body.trim()} className="rounded-xl font-bold">{posting ? "Publication…" : "Publier"}</Button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Les commentaires apparaissent après leur enregistrement. Les photos ne peuvent pas être publiées dans la communauté pour le moment.</p>
    </div> : <Link to="/auth" className="mb-4 block rounded-xl border p-3 text-sm text-primary">Connecte-toi pour commenter ou voter.</Link>}
    <Dialog open={!!commentToDelete} onOpenChange={(open) => { if (!open && !deletingComment) setCommentToDelete(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce commentaire ?</DialogTitle>
          <DialogDescription>Cette action est définitive. Le commentaire sera retiré de l’espace communautaire.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setCommentToDelete(null)} disabled={deletingComment}>Annuler</Button>
          <Button type="button" variant="destructive" onClick={() => void deleteComment()} disabled={deletingComment}>{deletingComment ? "Suppression…" : "Supprimer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {isLoading ? <p className="py-5 text-center text-sm text-muted-foreground">Chargement des échanges…</p>
      : error ? <p className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">Impossible de charger les commentaires.</p>
      : roots.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-center"><MessageCircle className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">Pas encore de publication</p><p className="mt-1 text-xs text-muted-foreground">Sois le premier à donner ton avis sur cette canette.</p></div>
      : <div className="space-y-3">{roots.map((comment) => <div key={comment.id} className="space-y-2"><Item comment={comment} />{comments.filter((reply) => reply.parent_id === comment.id).map((reply) => <Item key={reply.id} comment={reply} nested />)}</div>)}</div>}
  </section>;
}
