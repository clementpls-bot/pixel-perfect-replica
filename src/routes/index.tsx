import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Barcode, Check, ChevronRight, Crown, Library, ScanLine, Sparkles, Trophy, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cansdex — Chaque canette raconte une collection" },
      { name: "description", content: "Scanne, collectionne et complète ton mur de canettes. Découvre les marques, suis ta progression et partage ta passion avec la communauté Cansdex." },
      { property: "og:title", content: "Cansdex — La collection de canettes réinventée" },
      { property: "og:description", content: "Scanne, collectionne et complète ton mur de canettes." },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: ScanLine,
    number: "01",
    title: "Scanne et ajoute",
    description: "Un code-barres, et ta canette rejoint ta collection. Retrouve facilement chaque modèle dans le catalogue.",
    tint: "bg-violet-100 text-violet-700",
  },
  {
    icon: Library,
    number: "02",
    title: "Construis ton mur",
    description: "Rassemble tes trouvailles, suis les marques que tu complètes et garde une trace de chaque découverte.",
    tint: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: Trophy,
    number: "03",
    title: "Fais progresser ta collection",
    description: "Visualise tes statistiques, débloque des succès et découvre quelles marques méritent encore ta chasse.",
    tint: "bg-amber-100 text-amber-700",
  },
];

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/collection", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#fbfaff] text-[#211d2c]">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Cansdex, accueil">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#7460b5] text-lg font-black text-white shadow-lg shadow-violet-200">C</span>
          <span className="font-display text-xl font-extrabold tracking-tight">Cans<span className="text-[#8872c9]">dex</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#706a7d] md:flex">
          <a href="#fonctionnalites" className="transition hover:text-[#7460b5]">Fonctionnalités</a>
          <a href="#communaute" className="transition hover:text-[#7460b5]">La communauté</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-[#625778] transition hover:bg-violet-50 sm:inline-flex">Connexion</Link>
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-[#7460b5] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-[#6651a8]">
            Rejoindre Cansdex <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 md:pb-28 md:pt-16 lg:grid-cols-[1.02fr_.98fr] lg:px-12">
          <div className="pointer-events-none absolute -left-40 top-12 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3.5 py-2 text-xs font-bold text-[#7663ad] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> Le terrain de jeu des collectionneurs
            </div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.06] tracking-[-0.055em] sm:text-6xl lg:text-[4.4rem]">
              Chaque canette a sa place.
              <span className="mt-2 block bg-gradient-to-r from-[#7862bd] via-[#b16f9f] to-[#4f9b8a] bg-clip-text text-transparent">À toi de toutes les trouver.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#777181] sm:text-lg">
              Cansdex transforme ta passion des canettes en une vraie collection. Scanne tes trouvailles, complète les marques et retrouve toute ta collection au même endroit.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#7460b5] px-7 text-base font-extrabold text-white shadow-xl shadow-violet-200 transition hover:-translate-y-1 hover:bg-[#6651a8]">
                Commencer ma collection <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#fonctionnalites" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#e8e3ef] bg-white/80 px-6 text-sm font-bold text-[#5e586b] transition hover:border-violet-200 hover:bg-white">
                Découvrir Cansdex <ChevronRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[#8a8494]">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" /> Gratuit pour commencer</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" /> Pensé pour les passionnés</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[570px]">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-violet-200/70 via-pink-100/70 to-emerald-100/80 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/80 bg-white/75 p-4 shadow-[0_30px_100px_-35px_rgba(93,74,139,.35)] backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between border-b border-[#eeeaf3] pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#7460b5] text-xs font-black text-white">C</span>
                  <span className="text-sm font-extrabold">Mon mur</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Ma collection</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[#f1eafe] p-3 text-center">
                  <p className="font-display text-2xl font-black text-[#7862bd]">24</p>
                  <p className="mt-1 text-[10px] font-bold text-[#81788e]">Canettes</p>
                </div>
                <div className="rounded-2xl bg-[#e9f6f0] p-3 text-center">
                  <p className="font-display text-2xl font-black text-[#4d927d]">8</p>
                  <p className="mt-1 text-[10px] font-bold text-[#72877e]">Marques</p>
                </div>
                <div className="rounded-2xl bg-[#fff2df] p-3 text-center">
                  <p className="font-display text-2xl font-black text-[#bd8742]">62%</p>
                  <p className="mt-1 text-[10px] font-bold text-[#93816c]">Progression</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs font-extrabold">Dernières trouvailles</p>
                <span className="text-[10px] font-bold text-[#8c80aa]">Illustration de l'interface</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[#eee8f6] bg-gradient-to-b from-[#f3edff] to-white p-3">
                  <div className="mx-auto flex h-28 w-12 items-center justify-center rounded-[13px] border border-white/80 bg-gradient-to-b from-[#e8c9fa] via-[#9b75ce] to-[#634d9d] shadow-lg shadow-violet-200/70">
                    <span className="text-center text-[9px] font-black leading-tight text-white">ENERGY<br/>DRINK</span>
                  </div>
                  <p className="mt-3 truncate text-[10px] font-extrabold">Édition violette</p>
                  <p className="mt-1 text-[9px] text-[#928a9e]">Ajoutée récemment</p>
                </div>
                <div className="rounded-2xl border border-[#e8f0eb] bg-gradient-to-b from-[#eaf8f0] to-white p-3">
                  <div className="mx-auto flex h-28 w-12 items-center justify-center rounded-[13px] border border-white/80 bg-gradient-to-b from-[#c5e8d5] via-[#63ad89] to-[#32745d] shadow-lg shadow-emerald-100">
                    <span className="text-center text-[9px] font-black leading-tight text-white">FRESH<br/>BOOST</span>
                  </div>
                  <p className="mt-3 truncate text-[10px] font-extrabold">Fresh edition</p>
                  <p className="mt-1 text-[9px] text-[#928a9e]">Ajoutée récemment</p>
                </div>
                <div className="rounded-2xl border border-[#f4e9e6] bg-gradient-to-b from-[#fff0eb] to-white p-3">
                  <div className="mx-auto flex h-28 w-12 items-center justify-center rounded-[13px] border border-white/80 bg-gradient-to-b from-[#ffc9b9] via-[#e77c69] to-[#ad4e52] shadow-lg shadow-rose-100">
                    <span className="text-center text-[9px] font-black leading-tight text-white">FRUIT<br/>SODA</span>
                  </div>
                  <p className="mt-3 truncate text-[10px] font-extrabold">Fruit collection</p>
                  <p className="mt-1 text-[9px] text-[#928a9e]">Ajoutée récemment</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#f7f4fb] p-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#7965b5] shadow-sm"><Barcode className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold">Une nouvelle trouvaille ?</p>
                  <p className="mt-0.5 text-[10px] text-[#8a8494]">Scanne-la pour l'ajouter à ton mur.</p>
                </div>
                <ScanLine className="h-5 w-5 text-[#7965b5]" />
              </div>
            </div>
            <div className="absolute -right-3 top-12 hidden -rotate-6 items-center gap-2 rounded-2xl border border-white bg-white px-4 py-3 text-xs font-extrabold text-[#5e9a82] shadow-xl sm:flex">
              <Sparkles className="h-4 w-4" /> Nouvelle trouvaille !
            </div>
            <div className="absolute -bottom-5 -left-4 hidden rotate-3 items-center gap-2 rounded-2xl border border-white bg-white px-4 py-3 text-xs font-extrabold text-[#7965b5] shadow-xl sm:flex">
              <Trophy className="h-4 w-4" /> Collection en progression
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="scroll-mt-10 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#8a75c4]">Ta passion, organisée</p>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Bien plus qu'une liste de canettes.</h2>
              <p className="mt-4 text-sm leading-7 text-[#817b8b] sm:text-base">Tout ce qu'il faut pour transformer chaque trouvaille en une collection dont tu peux être fier.</p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, number, title, description, tint }) => (
                <article key={number} className="group rounded-[1.75rem] border border-[#eeeaf3] bg-[#fdfcff] p-7 transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/60">
                  <div className="flex items-center justify-between">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tint}`}><Icon className="h-5 w-5" /></span>
                    <span className="font-display text-sm font-black text-[#d4cedf]">{number}</span>
                  </div>
                  <h3 className="mt-7 font-display text-xl font-extrabold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#817b8b]">{description}</p>
                  <div className="mt-6 flex items-center gap-2 text-xs font-extrabold text-[#806dbb] opacity-0 transition group-hover:opacity-100">À découvrir <ArrowRight className="h-3.5 w-3.5" /></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="communaute" className="scroll-mt-10 px-5 py-20 sm:px-8 sm:py-24">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#272238] px-7 py-12 text-white sm:px-12 sm:py-16 lg:px-16">
            <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#8b73c9]/30 blur-3xl" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-200"><Users className="h-3.5 w-3.5" /> Une passion à partager</div>
                <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">La prochaine pièce de ta collection est peut-être juste à côté.</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">Découvre les canettes, échange autour de tes trouvailles et fais grandir ta collection avec les autres passionnés.</p>
              </div>
              <Link to="/auth" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-white px-7 text-sm font-extrabold text-[#514276] shadow-xl transition hover:-translate-y-1 hover:bg-violet-50">Rejoindre la communauté <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-[#7965b5]"><Crown className="h-7 w-7" /></div>
            <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Prêt à commencer ta collection ?</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#817b8b] sm:text-base">Tes prochaines trouvailles n'attendent que toi. Crée ton compte et donne une place à chaque canette.</p>
            <Link to="/auth" className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#7460b5] px-8 text-base font-extrabold text-white shadow-xl shadow-violet-200 transition hover:-translate-y-1 hover:bg-[#6651a8]">Créer mon compte <ArrowRight className="h-5 w-5" /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#eeeaf3] bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs font-semibold text-[#928c9c] sm:flex-row">
          <Link to="/" className="font-display text-base font-extrabold text-[#302a3d]">Cans<span className="text-[#8872c9]">dex</span></Link>
          <p>La collection commence avec une canette.</p>
          <div className="flex gap-5"><Link to="/auth" className="hover:text-[#7460b5]">Connexion</Link><Link to="/brands" className="hover:text-[#7460b5]">Catalogue</Link></div>
        </div>
      </footer>
    </div>
  );
}
