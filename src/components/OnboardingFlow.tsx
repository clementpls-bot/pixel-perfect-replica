import { useEffect, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Camera, Check, MessageCircle, ScanBarcode, Wine, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const USERNAME_RULE = /^[A-Za-z0-9_.-]{3,24}$/;

const chapters = [
  { icon: ScanBarcode, eyebrow: "TA COLLECTION", title: "Une canette ? Elle est à toi.", copy: "Scanne simplement son code-barres. Si elle est dans le catalogue, elle rejoint ton mur en quelques secondes.", detail: "Et si elle n’y est pas encore, tu peux la proposer." },
  { icon: Wine, eyebrow: "TES DÉGUSTATIONS", title: "Chaque canette a son histoire.", copy: "Quand tu dégustes une canette de ta collection, ajoute un Drink. Tu gardes ainsi une trace de tes découvertes et de tes habitudes.", detail: "Ton compteur évolue avec chacune de tes dégustations." },
  { icon: Users, eyebrow: "LE CREW", title: "La collection, c’est encore mieux à plusieurs.", copy: "Ajoute tes amis grâce à leur pseudo, suis leurs collections et comparez vos progressions.", detail: "Retrouve aussi les classements et les défis de la communauté." },
  { icon: MessageCircle, eyebrow: "LA COMMUNAUTÉ", title: "Parle canettes avec les autres.", copy: "Échange autour des canettes, partage tes avis, tes trouvailles et tes découvertes avec les autres collectionneurs.", detail: "Chaque canette devient un point de rencontre." },
];

export function OnboardingFlow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["first-login-onboarding", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles")
        .select("id,username,display_name,avatar_url,onboarding_completed")
        .eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) setUsername(profile.username ?? "");
  }, [profile?.id]);

  if (!user || isLoading || !profile || profile.onboarding_completed) return null;

  const finish = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      if (avatarFile) {
        setAvatarBusy(true);
        const ext = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, avatarFile, {
          cacheControl: "3600", contentType: avatarFile.type, upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("profile-avatars").getPublicUrl(path);
        const { error } = await (supabase as any).from("profiles").update({ avatar_url: publicUrl.publicUrl }).eq("id", user.id);
        if (error) throw error;
      }
      const { error } = await (supabase as any).from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["first-login-onboarding", user.id] });
      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Bienvenue dans le crew Cansdex !");
      navigate({ to: "/collection", replace: true });
    } catch (error) {
      toast.error((error as Error).message || "Impossible de terminer la présentation.");
    } finally {
      setSaving(false);
      setAvatarBusy(false);
    }
  };

  const saveUsername = async () => {
    const next = username.trim();
    if (!USERNAME_RULE.test(next)) {
      toast.error("Le pseudo doit contenir 3 à 24 caractères : lettres, chiffres, points, tirets ou tirets bas.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("profiles").update({ username: next, display_name: next }).eq("id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["first-login-onboarding", user.id] });
      setStep(1);
    } catch (error) {
      const message = (error as Error).message || "";
      toast.error(/duplicate|unique/i.test(message) ? "Ce pseudo est déjà utilisé. Essaie-en un autre." : message || "Impossible d’enregistrer ce pseudo.");
    } finally { setSaving(false); }
  };

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error("Choisis une image JPG, PNG ou WebP de 5 Mo maximum.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const totalSteps = 1 + chapters.length + 1;
  const progress = Math.round(((step + 1) / totalSteps) * 100);
  const ChapterIcon = step >= 1 && step <= chapters.length ? chapters[step - 1]!.icon : Check;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101116]/75 p-3 backdrop-blur-md sm:p-6">
      <section className="relative my-auto flex min-h-[min(680px,calc(100dvh-24px))] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-black/10 bg-white text-[#171923] shadow-[0_30px_100px_rgba(0,0,0,.35)]">
        <div className="h-1.5 w-full bg-[#ececf0]"><div className="h-full bg-[#1677FF] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="text-[11px] font-black uppercase tracking-[.18em]">CANS<span className="text-[#1677FF]">DEX</span></span>
          <span className="text-xs font-bold tabular-nums text-[#858791]">{step + 1} / {totalSteps}</span>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10">
          {step === 0 ? (
            <>
              <div className="mb-7 grid h-16 w-16 place-items-center rounded-[20px] bg-[#dfff43]"><Users className="h-8 w-8" /></div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1677FF]">AVANT DE COMMENCER</p>
              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-.05em] sm:text-4xl">On t’appelle comment ?</h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#666975]">Choisis ton pseudo : c’est sous ce nom que les autres collectionneurs pourront te retrouver.</p>
              <label className="mb-2 mt-8 text-xs font-bold">Ton pseudo</label>
              <Input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} placeholder="Ex. CanHunter" className="h-13 rounded-xl border-[#dfe0e5] text-base" />
              <p className="mt-2 text-[11px] text-[#858791]">3 à 24 caractères · lettres, chiffres, . _ -</p>
              <Button onClick={() => void saveUsername()} disabled={saving} className="mt-7 h-12 rounded-xl bg-[#171923] font-bold text-white hover:bg-[#30333e]">C’est parti <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
              <div className="mb-7 grid h-20 w-20 place-items-center overflow-hidden rounded-full border-4 border-[#dfff43] bg-[#f1f2f5] text-[#777b86]">
                {avatarPreview ? <img src={avatarPreview} alt="Aperçu de la photo de profil" className="h-full w-full object-cover" /> : <Camera className="h-8 w-8" />}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1677FF]">DERNIÈRE ÉTAPE</p>
              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-.05em] sm:text-4xl">Ajoute une photo de profil.</h1>
              <p className="mt-3 text-sm leading-6 text-[#666975]">Un visage, un logo ou une image qui te représente. Tu pourras la changer à tout moment.</p>
              <label className="mt-7 flex h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#bfc2cc] text-sm font-bold hover:bg-[#f7f8fa]">
                <Camera className="mr-2 h-4 w-4" /> {avatarFile ? "Changer la photo" : "Choisir une photo"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={chooseAvatar} />
              </label>
              <Button onClick={() => void finish()} disabled={saving || avatarBusy} className="mt-4 h-12 rounded-xl bg-[#171923] font-bold text-white hover:bg-[#30333e]">{saving ? "Finalisation…" : "Terminer et découvrir Cansdex"} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              <button onClick={() => void finish()} disabled={saving} className="mt-4 text-xs font-semibold text-[#777b86] underline underline-offset-4">Je le ferai plus tard</button>
            </>
          )}
        </div>

        {step > 0 && step <= chapters.length && <div className="flex items-center justify-between border-t border-[#ececf0] px-6 py-4 sm:px-10">
          <button onClick={() => setStep((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-1 text-xs font-bold text-[#777b86]"><ArrowLeft className="h-4 w-4" /> Retour</button>
          <Button onClick={() => setStep((value) => value + 1)} className="h-11 rounded-xl bg-[#171923] px-6 font-bold text-white hover:bg-[#30333e]">Continuer <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>}
      </section>
    </div>
  );
}
