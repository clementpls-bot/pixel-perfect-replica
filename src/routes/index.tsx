import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Barcode, Check, ChevronRight, Crown, Library, ScanLine, Trophy, Users, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cansdex — La chasse aux canettes commence ici" },
      { name: "description", content: "Scanne, collectionne et complète ton mur de canettes avec Cansdex." },
      { property: "og:title", content: "Cansdex — La chasse aux canettes commence ici" },
      { property: "og:description", content: "Scanne, collectionne et complète ton mur de canettes." },
    ],
  }),
  component: LandingPage,
});

const features = [
  { icon: ScanLine, number: "01", title: "REPÈRE. SCANNE.", description: "Un code-barres suffit pour retrouver une canette et l'ajouter à ta collection." },
  { icon: Library, number: "02", title: "COMPLÈTE TON MUR.", description: "Retrouve tes modèles, explore les marques et vois ta collection prendre forme." },
  { icon: Trophy, number: "03", title: "VA PLUS LOIN.", description: "Suis tes statistiques, débloque des succès et pars à la recherche des pièces manquantes." },
];

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/collection", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#f5f5f2] text-[#101c35]">
      <header className="relative z-20 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-9 lg:px-14">
        <Link to="/" className="flex items-center gap-2" aria-label="Cansdex, accueil">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#123b9a] text-xl font-black italic text-white">C</span>
          <span className="landing-display text-[1.65rem] font-black uppercase tracking-[-.07em]">CANS<span className="text-[#e22d32]">DEX</span></span>
        </Link>
        <nav className="hidden items-center gap-9 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#24334f] md:flex">
          <a href="#concept" className="transition hover:text-[#e22d32]">Le concept</a>
          <a href="#features" className="transition hover:text-[#e22d32]">Fonctionnalités</a>
          <a href="#communaute" className="transition hover:text-[#e22d32]">Communauté</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/auth" className="hidden px-3 py-3 text-[11px] font-extrabold uppercase tracking-[.12em] text-[#14264a] transition hover:text-[#e22d32] sm:inline-flex">Connexion</Link>
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-[#e22d32] px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white transition hover:bg-[#bd2028] sm:px-6">
            Rejoindre <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative isolate mx-auto grid min-h-[660px] max-w-[1440px] items-center gap-8 px-5 pb-20 pt-10 sm:px-9 lg:grid-cols-[.92fr_1.08fr] lg:px-14 lg:pb-28 lg:pt-12">
          <div className="pointer-events-none absolute -left-40 top-20 -z-10 h-[500px] w-[500px] rounded-full bg-[#dce4f2] blur-3xl" />
          <div className="relative z-10 max-w-[620px]">
            <div className="mb-7 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-[#e22d32]">
              <span className="h-[2px] w-8 bg-[#e22d32]" /> Le terrain de jeu des collectionneurs
            </div>
            <h1 className="landing-display text-[4.3rem] font-black uppercase leading-[.88] tracking-[-.065em] text-[#10234a] sm:text-[5.8rem] lg:text-[6.8rem]">
              La chasse<br />est <span className="text-[#e22d32]">ouverte.</span>
            </h1>
            <p className="mt-8 max-w-[440px] text-base font-medium leading-7 text-[#4e5a70] sm:text-lg">
              Chaque canette a son histoire. Scanne tes trouvailles, complète ta collection et découvre jusqu'où ta passion peut t'emmener.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#123b9a] px-8 text-[11px] font-black uppercase tracking-[.12em] text-white transition hover:-translate-y-1 hover:bg-[#0b2d78]">
                Lancer ma collection <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#concept" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-[#14264a]/20 px-7 text-[11px] font-black uppercase tracking-[.12em] text-[#14264a] transition hover:border-[#e22d32] hover:text-[#e22d32]">
                Découvrir Cansdex <ChevronRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#667187]">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#e22d32]" /> Gratuit pour commencer</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#e22d32]" /> Fait pour les passionnés</span>
            </div>
          </div>

          <div className="relative mx-auto min-h-[470px] w-full max-w-[680px] sm:min-h-[570px]">
            <div className="absolute right-[8%] top-[8%] h-[76%] w-[76%] rotate-[-7deg] rounded-[48%] bg-[#123b9a]" />
            <div className="absolute right-[2%] top-[15%] h-[72%] w-[72%] rotate-[8deg] rounded-[48%] border-[2px] border-[#e22d32]" />
            <div className="absolute left-[5%] top-[6%] z-10 rotate-[-13deg] rounded-full bg-[#f5c62d] px-5 py-3 text-[10px] font-black uppercase tracking-[.15em] text-[#10234a] shadow-xl">Collect. Repeat.</div>
            <div className="absolute left-[11%] top-[19%] z-20 flex h-[330px] w-[112px] -rotate-[13deg] items-center justify-center rounded-[27px] border-[5px] border-white/70 bg-gradient-to-b from-[#e5e9ed] via-[#aab7c7] to-[#edf0f2] shadow-[0_30px_50px_-20px_rgba(0,0,0,.45)] sm:left-[13%] sm:h-[390px] sm:w-[132px]">
              <div className="absolute inset-x-2 top-3 h-3 rounded-full bg-white/80" />
              <div className="flex h-[70%] w-full flex-col items-center justify-center bg-[#e22d32] text-center text-white shadow-inner">
                <span className="landing-display text-2xl font-black italic tracking-tighter sm:text-3xl">CANS</span>
                <span className="mt-1 text-[8px] font-black uppercase tracking-[.2em] sm:text-[9px]">Original</span>
                <span className="mt-7 text-4xl font-black">01</span>
              </div>
              <div className="absolute bottom-3 h-2 w-8 rounded-full bg-[#7b8795]" />
            </div>
            <div className="absolute right-[12%] top-[5%] z-30 flex h-[285px] w-[100px] rotate-[14deg] items-center justify-center rounded-[25px] border-[5px] border-white/70 bg-gradient-to-b from-[#f1f2f4] via-[#a8b6c9] to-[#e8ebef] shadow-[0_25px_45px_-18px_rgba(0,0,0,.5)] sm:right-[14%] sm:h-[345px] sm:w-[118px]">
              <div className="absolute inset-x-2 top-3 h-3 rounded-full bg-white/80" />
              <div className="flex h-[72%] w-full flex-col items-center justify-center bg-[#123b9a] text-center text-white">
                <span className="landing-display text-xl font-black italic tracking-tighter sm:text-2xl">CANS</span>
                <span className="mt-1 text-[8px] font-black uppercase tracking-[.18em]">Ultra</span>
                <span className="mt-6 text-3xl font-black">02</span>
              </div>
              <div className="absolute bottom-3 h-2 w-8 rounded-full bg-[#7b8795]" />
            </div>
            <div className="absolute bottom-[7%] left-[31%] z-30 flex h-[245px] w-[88px] -rotate-[3deg] items-center justify-center rounded-[23px] border-[5px] border-white/70 bg-gradient-to-b from-[#f0f2f4] via-[#b6c1cf] to-[#e8ebef] shadow-[0_25px_45px_-18px_rgba(0,0,0,.5)] sm:bottom-[4%] sm:left-[35%] sm:h-[300px] sm:w-[106px]">
              <div className="absolute inset-x-2 top-3 h-3 rounded-full bg-white/80" />
              <div className="flex h-[72%] w-full flex-col items-center justify-center bg-[#f5c62d] text-center text-[#10234a]">
                <span className="landing-display text-xl font-black italic tracking-tighter sm:text-2xl">CANS</span>
                <span className="mt-1 text-[8px] font-black uppercase tracking-[.18em]">Gold</span>
                <span className="mt-6 text-3xl font-black">03</span>
              </div>
              <div className="absolute bottom-3 h-2 w-8 rounded-full bg-[#7b8795]" />
            </div>
            <div className="absolute bottom-[5%] right-[1%] z-40 max-w-[190px] rotate-[4deg] rounded-2xl bg-white p-4 shadow-2xl sm:right-[2%]">
              <div className="flex items-center gap-2 text-[#e22d32]"><Zap className="h-4 w-4 fill-current" /><span className="text-[9px] font-black uppercase tracking-[.16em]">À toi de jouer</span></div>
              <p className="mt-2 landing-display text-lg font-black uppercase leading-tight text-[#10234a]">La prochaine pièce est la tienne.</p>
            </div>
            <div className="absolute left-[1%] top-[54%] z-40 -rotate-6 rounded-full bg-white px-4 py-3 text-[9px] font-black uppercase tracking-[.14em] text-[#123b9a] shadow-xl">Ta collection. Tes règles.</div>
          </div>
        </section>

        <section id="concept" className="relative overflow-hidden bg-[#123b9a] py-20 text-white sm:py-28">
          <div className="absolute -right-20 -top-32 h-[420px] w-[420px] rounded-full border-[70px] border-white/5" />
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-5 sm:px-9 lg:grid-cols-[.8fr_1.2fr] lg:px-14">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#f5c62d]">Une passion, sans limite</p>
              <h2 className="mt-5 landing-display text-4xl font-black uppercase leading-[.95] tracking-[-.05em] sm:text-6xl">Plus qu'une canette.<br /><span className="text-[#f5c62d]">Une découverte.</span></h2>
            </div>
            <p className="max-w-2xl text-base font-medium leading-8 text-white/80 sm:text-lg">Cansdex rassemble les collectionneurs autour d'un même terrain de jeu. Des éditions classiques aux modèles les plus difficiles à trouver, chaque ajout te rapproche d'une collection qui te ressemble.</p>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-9 sm:py-28 lg:px-14">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#e22d32]">À toi de collectionner</p>
              <h2 className="mt-4 landing-display text-4xl font-black uppercase leading-none tracking-[-.05em] text-[#10234a] sm:text-6xl">Chaque trouvaille<br />compte.</h2>
            </div>
            <p className="max-w-sm text-sm font-medium leading-7 text-[#5d687b]">Tout ce qu'il te faut pour organiser ta collection et garder une longueur d'avance.</p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, number, title, description }, index) => (
              <article key={number} className={`relative min-h-[310px] overflow-hidden p-7 text-white transition duration-300 hover:-translate-y-2 ${index === 0 ? "bg-[#e22d32]" : index === 1 ? "bg-[#10234a]" : "bg-[#e5b91f] text-[#10234a]"}`}>
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-current/30"><Icon className="h-5 w-5" /></span>
                  <span className="landing-display text-5xl font-black opacity-30">{number}</span>
                </div>
                <h3 className="mt-16 landing-display text-3xl font-black uppercase leading-none tracking-[-.04em]">{title}</h3>
                <p className="mt-4 max-w-[290px] text-sm font-medium leading-6 opacity-80">{description}</p>
                <div className="absolute -bottom-12 -right-8 h-40 w-40 rounded-full border-[24px] border-current/10" />
              </article>
            ))}
          </div>
        </section>

        <section id="communaute" className="relative overflow-hidden bg-[#e9e9e4] px-5 py-20 sm:px-9 sm:py-28">
          <div className="mx-auto grid max-w-[1440px] items-center gap-10 lg:grid-cols-[1fr_auto] lg:px-5">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#e22d32]">Le collectif Cansdex</p>
              <h2 className="mt-5 landing-display text-4xl font-black uppercase leading-[.94] tracking-[-.055em] text-[#10234a] sm:text-6xl">Ta collection ne demande qu'à grandir.</h2>
              <p className="mt-6 max-w-xl text-base font-medium leading-7 text-[#596477]">Rejoins les passionnés, partage tes trouvailles et pars à la découverte de nouvelles canettes.</p>
            </div>
            <Link to="/auth" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#e22d32] px-8 text-[11px] font-black uppercase tracking-[.12em] text-white transition hover:-translate-y-1 hover:bg-[#bd2028]">Rejoindre la communauté <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section className="bg-[#f5f5f2] px-5 py-20 text-center sm:px-9 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f5c62d] text-[#10234a]"><Crown className="h-7 w-7" /></div>
            <h2 className="mt-6 landing-display text-4xl font-black uppercase leading-none tracking-[-.05em] text-[#10234a] sm:text-5xl">Prêt à partir à la chasse ?</h2>
            <p className="mx-auto mt-5 max-w-xl text-sm font-medium leading-7 text-[#667187]">Crée ton compte et commence à construire une collection qui ne ressemble qu'à toi.</p>
            <Link to="/auth" className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#123b9a] px-8 text-[11px] font-black uppercase tracking-[.12em] text-white transition hover:-translate-y-1 hover:bg-[#0b2d78]">Créer mon compte <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#101c35] px-5 py-8 text-white sm:px-9">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 sm:flex-row">
          <Link to="/" className="landing-display text-xl font-black uppercase tracking-[-.06em]">CANS<span className="text-[#e22d32]">DEX</span></Link>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/50">La collection commence avec une canette.</p>
          <div className="flex gap-6 text-[10px] font-extrabold uppercase tracking-[.12em] text-white/75"><Link to="/auth" className="hover:text-[#f5c62d]">Connexion</Link><Link to="/brands" className="hover:text-[#f5c62d]">Catalogue</Link></div>
        </div>
      </footer>
    </div>
  );
}
