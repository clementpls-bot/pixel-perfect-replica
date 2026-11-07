import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, Search, UserMinus, UserPlus, UserRound, UserX, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
};
type Person = { id: string; username: string; display_name?: string | null; avatar_url?: string | null };

const db = supabase as any;

function useFriendships() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friendships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("friendships").select("*")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Friendship[];
    },
  });
}

function usePeople(ids: string[]) {
  const stableIds = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["friendship-people", stableIds],
    enabled: stableIds.length > 0,
    queryFn: async () => {
      const { data, error } = await db.from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", stableIds);
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });
}

function useFriendActions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["friendships", user?.id] });
    await qc.invalidateQueries({ queryKey: ["friendship-people"] });
    await qc.invalidateQueries({ queryKey: ["public-profile-friendship"] });
  };
  const run = async (action: () => Promise<{ error: any }>, success: string) => {
    if (!user) return;
    try {
      const { error } = await action();
      if (error) throw error;
      await refresh();
      toast.success(success);
    } catch (error) {
      toast.error((error as Error).message || "Cette action n’a pas pu être effectuée.");
    }
  };
  return {
    send: (targetId: string, existing?: Friendship) => run(
      () => existing
        ? db.from("friendships").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", existing.id)
        : db.from("friendships").insert({ requester_id: user!.id, addressee_id: targetId, status: "pending" }),
      "Demande d’amitié envoyée."
    ),
    accept: (id: string) => run(() => db.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", id), "Demande acceptée."),
    decline: (id: string) => run(() => db.from("friendships").update({ status: "declined", updated_at: new Date().toISOString() }).eq("id", id), "Demande refusée."),
    cancel: (id: string) => run(() => db.from("friendships").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id), "Demande annulée."),
    remove: (id: string) => run(() => db.from("friendships").delete().eq("id", id), "Amitié supprimée."),
    block: (targetId: string) => run(() => db.from("user_blocks").insert({ blocker_id: user!.id, blocked_id: targetId }), "Utilisateur bloqué."),
    unblock: (targetId: string) => run(() => db.from("user_blocks").delete().eq("blocked_id", targetId), "Utilisateur débloqué."),
  };
}

function PersonLine({ person, trailing }: { person: Person; trailing?: React.ReactNode }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3">
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-sm font-black">
      {person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : person.username?.[0]?.toUpperCase() ?? <UserRound className="h-5 w-5" />}
    </div>
    <Link to="/users/$id" params={{ id: person.id }} className="min-w-0 flex-1 hover:underline">
      <span className="block truncate text-sm font-bold">{person.display_name || person.username}</span>
      <span className="block truncate text-xs text-muted-foreground">@{person.username}</span>
    </Link>
    {trailing}
  </div>;
}

export function FriendsHub() {
  const { user } = useAuth();
  const friendships = useFriendships();
  const rows = friendships.data ?? [];
  const friendIds = rows.filter((r) => r.status === "accepted").map((r) => r.requester_id === user?.id ? r.addressee_id : r.requester_id);
  const incomingIds = rows.filter((r) => r.status === "pending" && r.addressee_id === user?.id).map((r) => r.requester_id);
  const outgoingIds = rows.filter((r) => r.status === "pending" && r.requester_id === user?.id).map((r) => r.addressee_id);
  const people = usePeople([...friendIds, ...incomingIds, ...outgoingIds]);
  const blocked = useQuery({
    queryKey: ["blocked-users", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("user_blocks").select("blocked_id").eq("blocker_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((row: { blocked_id: string }) => row.blocked_id as string);
    },
  });
  const blockedPeople = usePeople(blocked.data ?? []);
  const actions = useFriendActions();
  const [search, setSearch] = useState("");
  const searchResults = useQuery({
    queryKey: ["friend-search", search.trim().toLowerCase()],
    enabled: !!user && search.trim().length >= 2,
    queryFn: async () => {
      const term = search.trim().replace(/[%,]/g, "");
      const { data, error } = await db.from("profiles").select("id,username,display_name,avatar_url")
        .ilike("username", `%${term}%`).neq("id", user!.id).limit(10);
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });
  const byId = useMemo(() => new Map((people.data ?? []).map((p) => [p.id, p])), [people.data]);
  const rowFor = (id: string) => rows.find((r) =>
    (r.requester_id === user?.id && r.addressee_id === id) ||
    (r.requester_id === id && r.addressee_id === user?.id)
  );
  const existingBlocked = new Set(blocked.data ?? []);

  return <section className="space-y-4 rounded-2xl border bg-card p-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-display text-xl uppercase">Mes amis</h2><p className="text-xs text-muted-foreground">{friendIds.length} ami(s) · {incomingIds.length} demande(s) reçue(s)</p></div>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted"><UserRound className="h-5 w-5" /></span>
    </div>
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un pseudo…" maxLength={24}
        className="h-11 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
    </div>
    {search.trim().length >= 2 && <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Résultats</p>
      {searchResults.isLoading ? <p className="text-xs text-muted-foreground">Recherche…</p>
        : searchResults.error ? <p className="text-xs text-destructive">Recherche impossible.</p>
        : !searchResults.data?.length ? <p className="text-xs text-muted-foreground">Aucun profil trouvé.</p>
        : searchResults.data.map((person) => {
          const relation = rowFor(person.id);
          const blockedByMe = existingBlocked.has(person.id);
          return <PersonLine key={person.id} person={person} trailing={
            blockedByMe ? <span className="text-[11px] text-muted-foreground">Indisponible</span>
              : relation?.status === "accepted" ? <span className="text-xs font-semibold text-muted-foreground">Ami</span>
              : relation?.status === "pending" && relation.requester_id === user?.id ? <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" /> Envoyée</span>
              : relation?.status === "pending" ? <span className="text-[11px] text-muted-foreground">Demande reçue</span>
              : <Button size="sm" className="h-8 rounded-lg" onClick={() => void actions.send(person.id, relation)}><UserPlus className="mr-1 h-3.5 w-3.5" /> Ajouter</Button>
          } />;
        })}
    </div>}
    {incomingIds.length > 0 && <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Demandes reçues</p>
      {incomingIds.map((id) => {
        const person = byId.get(id); const row = rowFor(id);
        if (!person || !row) return null;
        return <PersonLine key={id} person={person} trailing={<div className="flex gap-1">
          <Button size="icon" className="h-8 w-8 rounded-lg" aria-label="Accepter" onClick={() => void actions.accept(row.id)}><Check className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" aria-label="Refuser" onClick={() => void actions.decline(row.id)}><X className="h-4 w-4" /></Button>
        </div>} />;
      })}
    </div>}
    {outgoingIds.length > 0 && <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Demandes envoyées</p>
      {outgoingIds.map((id) => {
        const person = byId.get(id); const row = rowFor(id);
        if (!person || !row) return null;
        return <PersonLine key={id} person={person} trailing={<Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => void actions.cancel(row.id)}>Annuler</Button>} />;
      })}
    </div>}
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ma liste d’amis</p>
      {friendships.isLoading || people.isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p>
        : friendIds.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">Tu n’as pas encore d’amis. Recherche un pseudo pour commencer.</p>
        : friendIds.map((id) => {
          const person = byId.get(id); const row = rowFor(id);
          if (!person || !row) return null;
          return <PersonLine key={id} person={person} trailing={<Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" aria-label="Retirer cet ami" onClick={() => void actions.remove(row.id)}><UserMinus className="h-4 w-4" /></Button>} />;
        })}
    </div>
    {!!blockedPeople.data?.length && <div className="space-y-2 border-t pt-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Comptes bloqués</p>
      {blockedPeople.data.map((person) => <PersonLine key={person.id} person={person} trailing={<Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => void actions.unblock(person.id)}>Débloquer</Button>} />)}
    </div>}
  </section>;
}

export function FriendProfileActions({ targetId }: { targetId: string }) {
  const { user } = useAuth();
  const actions = useFriendActions();
  const rows = useFriendships();
  const blocked = useQuery({
    queryKey: ["blocked-users", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("user_blocks").select("blocked_id").eq("blocker_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((row: { blocked_id: string }) => row.blocked_id as string);
    },
  });
  const relationship = rows.data?.find((r) =>
    (r.requester_id === user?.id && r.addressee_id === targetId) ||
    (r.requester_id === targetId && r.addressee_id === user?.id)
  );
  const isBlocked = (blocked.data ?? []).includes(targetId);
  if (!user || user.id === targetId) return null;
  if (isBlocked) return <Button variant="outline" size="sm" className="rounded-xl" onClick={() => void actions.unblock(targetId)}>Débloquer</Button>;
  if (relationship?.status === "accepted") return <Button variant="outline" size="sm" className="rounded-xl" onClick={() => void actions.remove(relationship.id)}><UserMinus className="mr-1.5 h-4 w-4" /> Amis · Retirer</Button>;
  if (relationship?.status === "pending" && relationship.requester_id === user.id) return <Button variant="outline" size="sm" className="rounded-xl" onClick={() => void actions.cancel(relationship.id)}><Clock3 className="mr-1.5 h-4 w-4" /> Demande envoyée</Button>;
  if (relationship?.status === "pending") return <div className="flex gap-1">
    <Button size="sm" className="rounded-xl" onClick={() => void actions.accept(relationship.id)}><Check className="mr-1 h-4 w-4" /> Accepter</Button>
    <Button size="sm" variant="outline" className="h-8 w-8 rounded-xl px-0" aria-label="Refuser la demande" onClick={() => void actions.decline(relationship.id)}><X className="h-4 w-4" /></Button>
  </div>;
  return <div className="flex flex-wrap gap-2">
    <Button size="sm" className="rounded-xl" onClick={() => void actions.send(targetId, relationship)}><UserPlus className="mr-1.5 h-4 w-4" /> Ajouter</Button>
    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
      if (window.confirm("Bloquer ce compte ? Il ne pourra plus t’envoyer de demande d’amitié.")) void actions.block(targetId);
    }}><UserX className="mr-1.5 h-4 w-4" /> Bloquer</Button>
  </div>;
}
