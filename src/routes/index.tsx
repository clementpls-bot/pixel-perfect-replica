import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Library, ScanLine, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cansdex — Ta collection de canettes" },
      { name: "description", content: "Découvre, collectionne et partage tes canettes préférées avec Cansdex." },
      { property: "og:title", content: "Cansdex — Ta collection de canettes" },
      { property: "og:description", content: "Toutes tes canettes. Une seule collection." },
    ],
  }),
  component: LandingPage,
});

const features = [
  { icon: ScanLine, eyebrow: "01 / DÉCOUVRIR", title: "Chaque trouvaille compte", description: "Scanne le code-barres d'une canette et retrouve-la dans le catalogue. Ta prochaine découverte n'est qu'à un scan." },
  { icon: Library, eyebrow: "02 / COLLECTIONNER", title: "Construis ton propre mur", description: "Rassemble tes canettes, garde une trace de tes trouvailles et vois ta collection prendre forme." },
  { icon: Trophy, eyebrow: "03 / PROGRESSER", title: "Va toujours plus loin", description: "Suis tes statistiques, complète les marques et compare ta progression avec les autres passionnés." },
];

function CanArtwork() {
  return (
    <div className="relative mx-auto flex h-[310px] w-full max-w-[540px] items-end justify-center sm:h-[390px]" aria-label="Illustration de canettes Cansdex">
      <div className="absolute bottom-5 h-24 w-[90%] rounded-[50%] bg-[#006d9d]/25 blur-2xl" />
      <div className="absolute bottom-0 left-[3%] h-[220px] w-[104px] -rotate-[13deg] rounded-[22px_22px_17px_17px] border border-white/50 bg-gradient-to-r from-[#b9e9f5] via-[#f8ffff] to-[#77c9e5] shadow-2xl sm:left-[9%] sm:h-[270px] sm:w-[124px]">
        <div className="absolute inset-x-2 top-2 h-3 rounded-full border border-slate-500/30 bg-slate-200" />
        <div className="absolute inset-x-0 top-[38%] text-center font-black tracking-tight text-[#ed174c]"><span className="block text-[13px] sm:text-base">CANSDEX</span><span className="mt-1 block text-[8px] tracking-[.25em] text-[#087eae]">COLLECTOR</span></div>
        <div className="absolute bottom-4 inset-x-0 text-center text-[8px] font-bold tracking-widest text-[#087eae]">ORIGINAL</div>
      </div>
      <div className="relative z-10 h-[265px] w-[126px] rounded-[25px_25px_19px_19px] border border-white/70 bg-gradient-to-r from-[#087bb0] via-[#f6ffff] to-[#009bd0] shadow-[0_28px_55px_-18px_rgba(0,55,95,.55)] sm:h-[340px] sm:w-[160px]">
        <div className="absolute inset-x-3 top-2 h-4 rounded-full border border-slate-500/40 bg-gradient-to-b from-slate-300 to-slate-100 shadow-inner" />
        <div className="absolute inset-x-0 top-[34%] text-center">
          <span className="block text-[19px] font-black tracking-[-.08em] text-[#e51b4b] sm:text-2xl">CANSDEX</span>
          <span className="mt-1 block text-[8px] font-extrabold tracking-[.28em] text-[#075d89] sm:text-[10px]">COLLECT EVERY CAN</span>
          <span className="mx-auto mt-4 block h-12 w-12 rounded-full border-2 border-[#f4cf36] bg-[#087eae]/10 sm:h-16 sm:w-16" />
        </div>
        <div className="absolute bottom-5 inset-x-0 text-center text-[8px] font-bold tracking-[.25em] text-[#075d89]">YOUR COLLECTION</div>
      </div>
      <div className="absolute bottom-0 right-[3%] h-[205px] w-[100px] rotate-[12deg] rounded-[22px_22px_17px_17px] border border-white/50 bg-gradient-to-r from-[#b4e4a2] via-[#efffe7] to-[#75bd68] shadow-2xl sm:right-[9%] sm:h-[255px] sm:w-[120px]">
        <div className="absolute inset-x-2 top-2 h-3 rounded-full border border-slate-500/30 bg-slate-200" />
        <div className="absolute inset-x-0 top-[38%] text-center font-black text-[#287f4b]"><span className="block text-[12px] sm:text-sm">CANSDEX</span><span className="mt-1 block text-[8px] tracking-[.2em]">FRESH</span></div>
        <div className="absolute bottom-4 inset-x-0 text-center text-[8px] font-bold tracking-widest text-[#287f4b]">EDITION</div>
      </div>
    </div>
  );
}

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/collection", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen overflow-hidden bg-white text-[#101d2b]">
      <header className="relative z-20 flex h-[76px] items-center justify-between border-b border-black/5 bg-white px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Cansdex, accueil">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#079bd0] text-xl font-black text-white">C</span>
          <span className="text-[25px] font-extrabold tracking-[-.07em]">Cans<span className="text-[#079bd0]">dex</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#43505d] md:flex">
          <a href="#univers" className="transition hover:text-[#079bd0]">L'univers Cansdex</a>
          <a href="#fonctionnalites" className="transition hover:text-[#079bd0]">Comment ça marche</a>
        </nav>
        <Link to="/auth" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#101d2b] px-5 text-sm font-bold text-white transition hover:bg-[#24445d]">Se connecter <ArrowRight className="ml-2 h-4 w-4" /></Link>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#079bd0] px-5 pb-0 pt-12 text-center text-white sm:pt-16">
          <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[#55c5e9]/50 blur-3xl" />
          <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-[#0075aa]/40 blur-3xl" />
          <div className="relative z-10 mx-auto max-w-4xl">
            <p className="text-xs font-extrabold tracking-[.2em] text-white/75 sm:text-sm">LE TERRAIN DE JEU DES COLLECTIONNEURS</p>
            <h1 className="mt-5 text-[clamp(2.6rem,8vw,5.5rem)] font-extrabold leading-[.98] tracking-[-.065em]">Toutes tes canettes.<br />Une collection.</h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/90 sm:text-[22px]">Découvre, collectionne et partage tes trouvailles. Le monde des canettes prend une toute autre dimension avec Cansdex.</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/auth" className="inline-flex min-h-[58px] items-center justify-center rounded-full bg-white px-9 text-base font-bold text-[#101d2b] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f1faff]">Commencer ma collection <ArrowRight className="ml-3 h-5 w-5" /></Link>
              <Link to="/brands" className="inline-flex min-h-[58px] items-center justify-center rounded-full border border-white/40 bg-[#00547c]/75 px-9 text-base font-bold text-white transition hover:bg-[#00466b]">Explorer le catalogue</Link>
            </div>
          </div>
          <div className="relative z-10 mx-auto mt-8 max-w-3xl sm:mt-10"><CanArtwork /></div>
          <div className="relative z-10 -mx-5 h-5 bg-white" />
        </section>

        <section id="univers" className="bg-white px-5 py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[.9fr_1.1fr] md:gap-20">
            <div>
              <p className="text-xs font-extrabold tracking-[.2em] text-[#079bd0]">BIENVENUE DANS TA COLLECTION</p>
              <h2 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-[-.05em] sm:text-5xl">Une passion qui se collectionne.</h2>
            </div>
            <p className="text-lg leading-9 text-[#344252] sm:text-xl">Une canette aperçue en magasin, une édition limitée dénichée par hasard, une marque que tu veux compléter… Cansdex rassemble toutes tes découvertes et donne vie à ta collection.</p>
          </div>
        </section>

        <section id="fonctionnalites" className="bg-[#f4f6f7] px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold tracking-[.2em] text-[#079bd0]">COMMENT ÇA MARCHE</p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-.05em] sm:text-5xl">À toi de jouer.</h2>
              <p className="mt-5 text-base leading-8 text-[#596675] sm:text-lg">Trois étapes pour faire de tes trouvailles une collection qui te ressemble.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, eyebrow, title, description }) => (
                <article key={eyebrow} className="rounded-[26px] bg-white p-7 shadow-[0_12px_35px_-28px_rgba(15,35,50,.3)] sm:p-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4f6fc] text-[#078fbe]"><Icon className="h-6 w-6" /></div>
                  <p className="mt-7 text-[11px] font-extrabold tracking-[.17em] text-[#079bd0]">{eyebrow}</p>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#687482]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[30px] bg-[#092e46] px-7 py-12 text-white sm:px-14 sm:py-16">
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold tracking-[.2em] text-[#61d4f4]">LA COLLECTION NE FAIT QUE COMMENCER</p>
                <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-[-.05em] sm:text-5xl">La prochaine trouvaille est la tienne.</h2>
                <p className="mt-5 text-base leading-8 text-white/70">Rejoins les collectionneurs et donne une place à chaque canette.</p>
              </div>
              <Link to="/auth" className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-7 font-bold text-[#092e46] transition hover:-translate-y-0.5 hover:bg-[#e7f8ff]">Rejoindre Cansdex <ArrowRight className="ml-3 h-5 w-5" /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e8edf0] bg-white px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[#71808d] sm:flex-row">
          <Link to="/" className="text-xl font-extrabold tracking-[-.06em] text-[#101d2b]">Cans<span className="text-[#079bd0]">dex</span></Link>
          <p>Chaque canette raconte une collection.</p>
          <div className="flex gap-6"><Link to="/auth" className="hover:text-[#079bd0]">Connexion</Link><Link to="/brands" className="hover:text-[#079bd0]">Catalogue</Link></div>
        </div>
      </footer>
    </div>
  );
}
