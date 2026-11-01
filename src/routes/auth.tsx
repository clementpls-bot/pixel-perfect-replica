import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Cansdex" },
      { name: "description", content: "Connectez-vous pour scanner et collectionner des canettes." },
      { property: "og:title", content: "Connexion — Cansdex" },
      { property: "og:description", content: "Connectez-vous pour scanner et collectionner des canettes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (user) navigate({ to: "/collection" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { username } },
      });
      if (error) toast.error(error.message);
      else toast.success("Consultez vos e-mails pour confirmer votre compte.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("La connexion avec Google a échoué.");
  };

  return (
    <div className="pt-8">
      <h1 className="text-3xl font-black">CANS<span className="text-primary">DEX</span></h1>
      <p className="mt-2 text-muted-foreground">{mode === "in" ? "Bon retour parmi les collectionneurs." : "Commencez votre collection."}</p>
      <form onSubmit={submit} className="mt-8 space-y-3">
        {mode === "up" && <Input placeholder="Nom d’utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} required className="h-12 rounded-xl" />}
        <Input type="email" placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
        <Input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12 rounded-xl" />
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl font-bold">{mode === "in" ? "Se connecter" : "Créer un compte"}</Button>
      </form>
      <Button variant="secondary" onClick={google} className="mt-3 h-12 w-full rounded-xl font-semibold">Continuer avec Google</Button>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 w-full text-sm text-muted-foreground">
        {mode === "in" ? "Nouveau ici ? Créer un compte" : "Déjà collectionneur ? Se connecter"}
      </button>
    </div>
  );
}
