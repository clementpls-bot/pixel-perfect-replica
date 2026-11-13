import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, MessageCircle, ScanBarcode, Wine, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const USERNAME_RULE = /^[A-Za-z0-9_.-]{3,24}$/;
const INTRO_KEY = "cansdex_guest_intro_completed";

const chapters = [
  { icon: ScanBarcode, eyebrow: "TA COLLECTION", title: "Une canette ? Elle est à toi.", copy: "Scanne simplement son code-barres. Si elle est dans le catalogue, elle rejoint ton mur en quelques secondes.", detail: "Et si elle n’y est pas encore, tu peux la proposer." },
  { icon: Wine, eyebrow: "TES DÉGUSTATIONS", title: "Chaque canette a son histoire.", copy: "Quand tu dégustes une canette de ta collection, ajoute un Drink. Tu gardes ainsi une trace de tes découvertes et de tes habitudes.", detail: "Ton compteur évolue avec chacune de tes dégustations." },
  { icon: Users, eyebrow: "LE CREW", title: "La collection, c’est encore mieux à plusieurs.", copy: "Ajoute tes amis grâce à leur pseudo, suis leurs collections et comparez vos progressions.", detail: "Retrouve aussi les classements et les défis de la communauté." },
  { icon: MessageCircle, eyebrow: "LA COMMUNAUTÉ", title: "Parle canettes avec les autres.", copy: "Échange autour des canettes, partage tes avis, tes trouvailles et tes découvertes avec les autres collectionneurs.", detail: "Chaque canette devient un point de rencontre." },
];

export function OnboardingFlow() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [busy, setBusy] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);

  useEffect(() => {
    if (authLoading || user) return;
    try {
      if (window.localStorage.getItem(INTRO_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [authLoading, user]);

  const finishIntro = () => {
    try { window.localStorage.setItem(INTRO_KEY, "1"); } catch { /* Storage may be unavailable. */ }
    setVisible(false);
  };

  const submitAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (authMode === "signup" && !USERNAME_RULE.test(username.trim())) {
      toast.error("Le pseudo doit contenir 3 à 24 caractères : lettres, chiffres, points, tirets ou tirets bas.");
      return;
    }
    setBusy(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username.trim(), display_name: username.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          finishIntro();
          toast.success("Bienvenue dans le crew Cansdex !");
          navigate({ to: "/collection", replace: true });
        } else {
          try { window.localStorage.setItem(INTRO_KEY, "1"); } catch { /* Storage may be unavailable. */ }
          setConfirmationPending(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        finishIntro();
        toast.success("Content de te revoir !");
        navigate({ to: "/collection", replace: true });
      }
    } catch (error) {
      toast.error((error as Error).message || "Impossible de créer le compte.");
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
    } catch {
      toast.error("La connexion avec Google a échoué.");
    }
  };

  if (!visible || user || authLoading) return null;

  const totalSteps = 1 + chapters.length + 1;
  const progress = Math.round(((step + 1) / totalSteps) * 100);
  const ChapterIcon = step >= 1 && step <= chapters.length ? chapters[step - 1]!.icon : Check;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101116]/80 p-3 backdrop-blur-md sm:p-6">
      <section className="relative my-auto flex min-h-[min(680px,calc(100dvh-24px))] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-black/10 bg-white text-[#171923] shadow-[0_30px_100px_rgba(0,0,0,.35)]">
        <div className="h-1.5 w-full bg-[#ececf0]"><div className="h-full bg-[#1677FF] transition-all duration-500" style={{ width: confirmationPending ? "100%" : progress + "%" }} /></div>
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="text-[11px] font-black uppercase tracking-[.18em]">CANS<span className="text-[#1677FF]">DEX</span></span>
          <span className="text-xs font-bold tabular-nums text-[#858791]">{confirmationPending ? "C’est presque prêt" : step + 1 + " / " + totalSteps}</span>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10">
          {confirmationPending ? (
            <>
              <div className="mb-7 grid h-16 w-16 place-items-center rounded-[20px] bg-[#dfff43]"><Check className="h-8 w-8" /></div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1677FF]">BIENVENUE CHEZ CANSDEX</p>
              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-.05em] sm:text-4xl">Vérifie ta boîte mail.</h1>
              <p className="mt-4 text-sm leading-6 text-[#666975]">Ton compte a été créé. Clique sur le lien de confirmation envoyé à <strong>{email}</strong> pour activer ton accès et commencer ta collection.</p>
              <Button onClick={finishIntro} className="mt-8 h-12 rounded-xl bg-[#171923] font-bold text-white hover:bg-[#30333e]">J’ai compris</Button>
            </>
          ) : step === 0 ? (
            <>
              <div className="mb-7 grid h-16 w-16 place-items-center rounded-[20px] bg-[#dfff43]"><Users className="h-8 w-8" /></div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1677FF]">BIENVENUE SUR CANSDEX</p>
              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-.05em] sm:text-4xl">Le monde des canettes, à collectionner.</h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-[#666975]">Découvre comment fonctionne Cansdex. En quelques étapes, tu verras tout ce que tu peux collectionner, suivre et partager.</p>
              <Button onClick={() => setStep(1)} className="mt-8 h-12 rounded-xl bg-[#171923] font-bold text-white hover:bg-[#30333e]">Découvrir Cansdex <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </>
          ) : step <= chapters.length ? (
            <>
              <div className="mb-7 grid h-16 w-16 place-items-center rounded-[20px] bg-[#eef1ff] text-[#5650df]"><ChapterIcon className="h-8 w-8" /></div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1677FF]">{chapters[step - 1]!.eyebrow}</p>
              <h1 className="mt-3 max-w-md text-3xl font-black leading-[1.05] tracking-[-.05em] sm:text-4xl">{chapters[step - 1]!.title}</h1>
              <p className="mt-4 text-base leading-7 text-[#555965]">{chapters[step - 1]!.copy}</p>
              <div className="mt-6 rounded-2xl bg-[#f4f5f8] p-4 text-sm font-semibold leading-6 text-[#454955]">{chapters[step - 1]!.detail}</div>
            </>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1677FF]">REJOINS LE CREW</p>
              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-.05em] sm:text-4xl">Prêt à commencer ta collection ?</h1>
              <p className="mt-3 text-sm leading-6 text-[#666975]">Crée ton compte pour sauvegarder ton mur, tes Drinks et retrouver tes amis.</p>
              <div className="mt-6 flex rounded-xl bg-[#f1f2f5] p-1">
                <button type="button" onClick={() => setAuthMode("signup")} className={"flex-1 rounded-lg py-2.5 text-sm font-bold " + (authMode === "signup" ? "bg-white shadow-sm" : "text-[#777b86]")}>Créer un compte</button>
                <button type="button" onClick={() => setAuthMode("login")} className={"flex-1 rounded-lg py-2.5 text-sm font-bold " + (authMode === "login" ? "bg-white shadow-sm" : "text-[#777b86]")}>J’ai déjà un compte</button>
              </div>
              <form onSubmit={submitAccount} className="mt-4 space-y-3">
                {authMode === "signup" && <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ton pseudo" maxLength={24} required className="h-12 rounded-xl border-[#dfe0e5]" />}
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" required className="h-12 rounded-xl border-[#dfe0e5]" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" minLength={6} required className="h-12 rounded-xl border-[#dfe0e5]" />
                <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-[#171923] font-bold text-white hover:bg-[#30333e]">{busy ? "Un instant…" : authMode === "signup" ? "Créer mon compte et rejoindre Cansdex" : "Me connecter"} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </form>
              {authMode === "signup" && <Button type="button" variant="outline" onClick={() => void continueWithGoogle()} className="mt-3 h-11 w-full rounded-xl font-semibold">Continuer avec Google</Button>}
            </>
          )}
        </div>

        {!confirmationPending && <div className="flex items-center justify-between border-t border-[#ececf0] px-6 py-4 sm:px-10">
          <button type="button" onClick={() => step === 0 ? finishIntro() : setStep((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-1 text-xs font-bold text-[#777b86]">{step === 0 ? "Fermer" : <><ArrowLeft className="h-4 w-4" /> Retour</>}</button>
          {step > 0 && step <= chapters.length && <Button onClick={() => setStep((value) => value + 1)} className="h-11 rounded-xl bg-[#171923] px-6 font-bold text-white hover:bg-[#30333e]">Continuer <ArrowRight className="ml-2 h-4 w-4" /></Button>}
          {step > chapters.length && <span className="text-[11px] text-[#858791]">Dernière étape</span>}
        </div>}
      </section>
    </div>
  );
}
