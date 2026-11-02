import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Library,
  Search,
  ScanLine,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

type Choice = {
  value: string;
  title: string;
  description?: string;
  icon?: typeof Library;
  accent: string;
};

const collectionSizes = [
  { value: "0", title: "Pas encore", description: "Je commence de zéro", accent: "border-cyan-400 bg-cyan-400/10" },
  { value: "1–10", title: "1 à 10", description: "Quelques trouvailles", accent: "border-lime-400 bg-lime-400/10" },
  { value: "11–30", title: "11 à 30", description: "Ça commence à compter", accent: "border-orange-400 bg-orange-400/10" },
  { value: "31–100", title: "31 à 100", description: "Une belle collection", accent: "border-fuchsia-400 bg-fuchsia-400/10" },
  { value: "101–300", title: "101 à 300", description: "Un vrai collectionneur", accent: "border-sky-400 bg-sky-400/10" },
  { value: "300+", title: "Plus de 300", description: "Une collection XXL", accent: "border-yellow-300 bg-yellow-300/10" },
];

const goals: Choice[] = [
  { value: "collection", title: "Construire mon mur", description: "Rassembler et exposer mes canettes.", icon: Library, accent: "border-cyan-400 bg-cyan-400/10" },
  { value: "discover", title: "Découvrir des canettes", description: "Explorer le catalogue et les nouveautés.", icon: Search, accent: "border-lime-400 bg-lime-400/10" },
  { value: "drinks", title: "Suivre ce que je bois", description: "Garder une trace de mes dégustations.", icon: Zap, accent: "border-orange-400 bg-orange-400/10" },
  { value: "community", title: "Partager ma passion", description: "Échanger avec d'autres collectionneurs.", icon: Users, accent: "border-fuchsia-400 bg-fuchsia-400/10" },
];

const brands: Choice[] = [
  { value: "Monster", title: "Monster", description: "Toutes les éditions et déclinaisons", accent: "border-lime-400 bg-lime-400/10" },
  { value: "Red Bull", title: "Red Bull", description: "Les classiques et éditions spéciales", accent: "border-sky-400 bg-sky-400/10" },
  { value: "Autres marques", title: "Autres marques", description: "Découvrir tout le reste", accent: "border-orange-400 bg-orange-400/10" },
  { value: "Aucune préférence", title: "Un peu de tout", description: "Je suis ouvert à toutes les découvertes", accent: "border-fuchsia-400 bg-fuchsia-400/10" },
];

const stepLabels = ["Ta collection", "Tes envies", "Tes marques"];

function ConversionFunnel() {
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const canContinue =
    (step === 0 && Boolean(quantity)) ||
    (step === 1 && selectedGoals.length > 0) ||
    (step === 2 && selectedBrands.length > 0);

  const toggleGoal = (value: string) => {
    setSelectedGoals((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toggleBrand = (value: string) => {
    setSelectedBrands((current) => {
      if (value === "Aucune préférence") {
        return current.includes(value) ? [] : [value];
      }
      const withoutAll = current.filter((item) => item !== "Aucune préférence");
      return withoutAll.includes(value)
        ? withoutAll.filter((item) => item !== value)
        : [...withoutAll, value];
    });
  };

  const saveAndSignUp = () => {
    try {
      window.localStorage.setItem(
        "cansdex_onboarding_v1",
        JSON.stringify({
          collectionSize: quantity,
          goals: selectedGoals,
          brands: selectedBrands,
          completedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // The sign-up flow remains available when browser storage is disabled.
    }
    window.location.assign("/auth?mode=up");
  };

  const selectedGoalLabels = selectedGoals
    .map((value) => goals.find((item) => item.value === value)?.title)
    .filter(Boolean);
  const selectedBrandLabels = selectedBrands;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-cyan-500/20 blur-[110px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-64 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-lime-400/10 blur-[100px]" />

      <header className="relative z-10 mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Cansdex, accueil">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#00c2f2] text-xl font-black text-[#07131f] shadow-[0_0_28px_rgba(0,194,242,.3)]">C</span>
          <span className="text-[25px] font-black tracking-[-.07em]">Cans<span className="text-[#00c2f2]">dex</span><span className="text-orange-400">.</span></span>
        </Link>
        <Link to="/auth" className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold text-white/75 transition hover:border-white/40 hover:text-white">
          Déjà membre ? <span className="text-[#00c2f2]">Connexion</span>
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] max-w-6xl flex-col items-center px-5 pb-12 pt-5 sm:px-8 sm:pt-10">
        <div className="mb-7 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-white/40 sm:text-xs">
          <Sparkles className="h-4 w-4 text-orange-400" />
          Ton univers de collection commence ici
        </div>

        <section className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-[#101f2e]/90 p-5 shadow-[0_30px_100px_-45px_rgba(0,0,0,.9)] backdrop-blur-xl sm:rounded-[38px] sm:p-9">
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between text-xs font-bold">
              <span className="text-white/55">{step === 3 ? "DERNIÈRE ÉTAPE" : `ÉTAPE 0${step + 1} / 03`}</span>
              <span className="text-[#00c2f2]">{step === 3 ? "100" : Math.round(((step + 1) / 3) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-lime-300 shadow-[0_0_18px_rgba(0,194,242,.45)] transition-all duration-500"
                style={{ width: `${step === 3 ? 100 : ((step + 1) / 3) * 100}%` }}
              />
            </div>
            <div className="mt-3 hidden grid-cols-3 gap-2 sm:grid">
              {stepLabels.map((label, index) => (
                <span key={label} className={`text-[10px] font-extrabold uppercase tracking-[.16em] ${index <= step ? "text-white/80" : "text-white/25"}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {step === 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-400">On fait connaissance</p>
              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-.055em] sm:text-5xl">Combien de canettes as-tu déjà ?</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/55 sm:text-base">Pas besoin de les compter une par une. On veut simplement situer ta collection.</p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {collectionSizes.map((choice) => {
                  const active = quantity === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setQuantity(choice.value)}
                      className={`group relative min-h-28 rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 ${active ? choice.accent + " ring-2 ring-white/70" : "border-white/10 bg-white/[.035] hover:border-white/30 hover:bg-white/[.07]"}`}
                    >
                      {active && <Check className="absolute right-3 top-3 h-4 w-4 text-white" />}
                      <span className="block text-xl font-black tracking-tight sm:text-2xl">{choice.title}</span>
                      <span className="mt-1 block text-xs text-white/50">{choice.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-lime-400">À toi de choisir</p>
              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-.055em] sm:text-5xl">Qu'est-ce que tu veux faire sur Cansdex ?</h1>
              <p className="mt-4 text-sm leading-6 text-white/55 sm:text-base">Choisis tout ce qui te correspond. On adaptera ton expérience à tes envies.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {goals.map((choice) => {
                  const Icon = choice.icon ?? Sparkles;
                  const active = selectedGoals.includes(choice.value);
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleGoal(choice.value)}
                      className={`relative flex min-h-28 items-center gap-4 rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 ${active ? choice.accent + " ring-2 ring-white/70" : "border-white/10 bg-white/[.035] hover:border-white/30 hover:bg-white/[.07]"}`}
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black/20"><Icon className="h-6 w-6" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold">{choice.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-white/50">{choice.description}</span>
                      </span>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${active ? "border-white bg-white text-[#07131f]" : "border-white/25 text-transparent"}`}><Check className="h-4 w-4" /></span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-white/35">Tu peux sélectionner plusieurs réponses.</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-orange-400">Tes préférences</p>
              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-.055em] sm:text-5xl">Quelles marques t'intéressent ?</h1>
              <p className="mt-4 text-sm leading-6 text-white/55 sm:text-base">On commence avec tes marques préférées. Tu pourras évidemment explorer tout le catalogue.</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {brands.map((choice) => {
                  const active = selectedBrands.includes(choice.value);
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleBrand(choice.value)}
                      className={`relative flex min-h-32 flex-col justify-between rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 sm:min-h-36 sm:p-5 ${active ? choice.accent + " ring-2 ring-white/70" : "border-white/10 bg-white/[.035] hover:border-white/30 hover:bg-white/[.07]"}`}
                    >
                      {active && <Check className="absolute right-3 top-3 h-4 w-4" />}
                      <span className="text-lg font-black leading-tight sm:text-xl">{choice.title}</span>
                      <span className="mt-3 text-[11px] leading-5 text-white/50">{choice.description}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-white/35">Plusieurs choix possibles, sauf « Un peu de tout ».</p>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-lime-300 text-[#07131f] shadow-[0_0_45px_rgba(0,194,242,.25)]">
                <Trophy className="h-8 w-8" />
              </div>
              <p className="mt-6 text-center text-xs font-black uppercase tracking-[.2em] text-lime-300">Ton profil est prêt</p>
              <h1 className="mt-3 text-center text-3xl font-black leading-[1.05] tracking-[-.055em] sm:text-5xl">Il ne manque plus que ta collection.</h1>
              <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-6 text-white/55 sm:text-base">Cansdex rassemble tes trouvailles, tes découvertes et les passionnés de canettes au même endroit.</p>
              <div className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-5 sm:grid-cols-3">
                <div><p className="text-[10px] font-black uppercase tracking-widest text-white/35">Ta collection</p><p className="mt-2 font-extrabold">{collectionSizes.find((item) => item.value === quantity)?.title}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-white/35">Tes envies</p><p className="mt-2 text-sm font-bold">{selectedGoalLabels.join(", ")}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-white/35">Tes marques</p><p className="mt-2 text-sm font-bold">{selectedBrandLabels.join(", ")}</p></div>
              </div>
              <button type="button" onClick={saveAndSignUp} className="mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#00c2f2] via-[#29d5c0] to-[#b4ed4a] px-6 text-base font-black text-[#07131f] shadow-[0_12px_40px_-15px_rgba(0,194,242,.65)] transition duration-200 hover:-translate-y-1 hover:brightness-110">
                Créer mon compte gratuitement <ArrowRight className="h-5 w-5" />
              </button>
              <p className="mt-4 text-center text-xs text-white/35">C'est gratuit. Et ta collection t'attend.</p>
            </div>
          )}

          <div className="mt-9 flex items-center justify-between border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-white/55 transition hover:text-white disabled:invisible"
            >
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((current) => Math.min(3, current + 1))}
                disabled={!canContinue}
                className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#00c2f2] px-6 text-sm font-black text-[#07131f] transition hover:-translate-y-0.5 hover:bg-[#37d5fa] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Continuer <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-xs font-bold text-white/30">Bienvenue dans Cansdex</span>
            )}
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-white/30">
          Tu préfères regarder avant de te lancer ? <Link to="/brands" className="font-bold text-cyan-300 underline decoration-cyan-300/40 underline-offset-4 hover:text-white">Explorer le catalogue</Link>
        </p>
      </main>
    </div>
  );
}

export default ConversionFunnel;
