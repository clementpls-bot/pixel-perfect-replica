import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Library, ScanLine, Trophy, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cansdex — La chasse aux canettes commence ici" },
      { name: "description", content: "Scanne, collectionne et complète ton mur de canettes avec Cansdex." },
      { property: "og:title", content: "Cansdex — La chasse aux canettes commence ici" },
      { property: "og:description", content: "Scanne, collectionne et complète ton mur de canettes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const WORDS = "COLLECT SCAN HUNT CANS LEGEND FOCUS RARE DROP ";

/** Dense tonal graffiti words, like the background of the can. */
function TagPattern() {
  return <div className="lp-pattern" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <div key={i}>{WORDS.repeat(4)}</div>)}</div>;
}

/** Ripped-paper edge between two colour bands. */
function Torn({ color, flip }: { color: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className={`relative z-10 block h-6 w-full sm:h-10 ${flip ? "rotate-180" : ""}`} aria-hidden="true">
      <path d="M0 40 L0 18 L60 26 L110 8 L170 22 L230 12 L300 30 L350 14 L420 24 L480 4 L540 20 L610 10 L680 28 L740 12 L810 22 L870 6 L940 26 L1000 14 L1070 24 L1130 8 L1200 20 L1200 40Z" fill={color} stroke="var(--lp-cream)" strokeWidth="3" />
    </svg>
  );
}

function MiniCan({ body, top, flavour, className = "" }: { body: string; top: string; flavour: string; className?: string }) {
  return (
    <div className={`relative h-[300px] w-[120px] overflow-hidden rounded-[22px] border-[3px] border-[color:var(--lp-ink)] shadow-[8px_8px_0_var(--lp-ink)] sm:h-[360px] sm:w-[140px] ${className}`} style={{ background: body }}>
      <div className="lp-pattern !text-[1.4rem]" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <div key={i}>{WORDS}</div>)}</div>
      <div className="absolute inset-x-0 top-0 h-14" style={{ background: top, clipPath: "polygon(0 0,100% 0,100% 70%,80% 85%,60% 72%,40% 95%,20% 78%,0 90%)" }} />
      <p className="absolute inset-x-0 top-3 text-center font-[Barlow_Condensed] text-lg font-black italic text-[color:var(--lp-cream)] [-webkit-text-stroke:1px_var(--lp-ink)]">ENERGY</p>
      <p className="lp-tag absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-6xl sm:text-7xl">Cansdex</p>
      <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: top, clipPath: "polygon(0 30%,25% 10%,50% 28%,75% 0,100% 20%,100% 100%,0 100%)" }} />
      <p className="lp-sticker absolute inset-x-0 bottom-3 text-center text-lg">{flavour}</p>
    </div>
  );
}

const perks = [
  { icon: ScanLine, title: "Scan éclair", text: "Un code-barres et la canette est retrouvée.", bg: "var(--lp-blue)" },
  { icon: Library, title: "Mur légendaire", text: "Chaque design, chaque édition, rangés.", bg: "var(--lp-lime)" },
  { icon: Trophy, title: "Succès épiques", text: "Débloque des badges et monte de niveau.", bg: "var(--lp-peach)" },
  { icon: Users, title: "Zéro solo", text: "Partage tes trouvailles avec la commu.", bg: "var(--lp-cherry)" },
];

const stats = [
  { value: "100+", label: "Marques" },
  { value: "30+", label: "Succès" },
  { value: "3", label: "États" },
  { value: "0", label: "Limite" },
];

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/collection", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="lp min-h-screen overflow-hidden bg-[color:var(--lp-ink)] text-[color:var(--lp-ink)]">
      {/* Dark top band, like the can lid area */}
      <header className="relative bg-[color:var(--lp-grape-deep)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="lp-tag text-4xl" aria-label="Cansdex, accueil">Cansdex</Link>
          <Link to="/auth" className="lp-box inline-flex items-center gap-2 rounded-lg bg-[color:var(--lp-cream)] px-4 py-2 text-sm font-black uppercase italic">
            Rejoindre <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="lp-splat relative bg-[color:var(--lp-grape)]">
          <Torn color="var(--lp-grape-deep)" flip />
          <TagPattern />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-8 md:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="lp-sticker text-2xl">Energy · Zero limite</p>
              <h1 className="lp-tag mt-4 text-7xl sm:text-8xl lg:text-9xl">La chasse<br />est ouverte</h1>
              <p className="mt-8 max-w-md text-base font-bold leading-7 text-[color:var(--lp-cream)]">
                Scanne tes trouvailles, collectionne chaque design et complète le mur de canettes le plus légendaire.
              </p>
              <Link to="/auth" className="lp-box mt-8 inline-flex min-h-14 items-center gap-3 rounded-lg bg-[color:var(--lp-lime)] px-8 text-sm font-black uppercase italic transition hover:-translate-y-1">
                Lancer ma collection <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="flex items-end justify-center gap-3 sm:gap-5">
              <MiniCan body="var(--lp-grape)" top="var(--lp-grape-deep)" flavour="Grape" className="-rotate-6" />
              <MiniCan body="var(--lp-blue)" top="var(--lp-blue-deep)" flavour="Blue Razz" className="-translate-y-8" />
              <MiniCan body="var(--lp-lime)" top="var(--lp-cherry)" flavour="Sour" className="hidden rotate-6 sm:block" />
            </div>
          </div>
        </section>

        {/* Nutrition-label style stats */}
        <section className="relative bg-[color:var(--lp-blue)]">
          <Torn color="var(--lp-grape)" flip />
          <TagPattern />
          <div className="relative mx-auto max-w-6xl px-5 py-16">
            <div className="flex flex-wrap justify-center gap-4">
              {stats.map((s) => (
                <div key={s.label} className="lp-box w-28 rounded-xl bg-[color:var(--lp-cream)] px-3 py-4 text-center">
                  <p className="font-[Barlow_Condensed] text-5xl font-black leading-none">{s.value}</p>
                  <p className="mt-1 text-[11px] font-black uppercase">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="lp-sticker mt-6 text-center text-xl">Cansdex · transparent label</p>
          </div>
        </section>

        <section className="lp-splat relative bg-[color:var(--lp-cream)]">
          <Torn color="var(--lp-blue)" flip />
          <div className="mx-auto grid max-w-6xl gap-5 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map(({ icon: Icon, title, text, bg }) => (
              <article key={title} className="lp-box relative overflow-hidden rounded-xl p-6 transition hover:-translate-y-1" style={{ background: bg }}>
                <Icon className="h-10 w-10" strokeWidth={2.5} />
                <h3 className="lp-tag mt-6 text-4xl">{title}</h3>
                <p className="mt-3 rounded-md bg-[color:var(--lp-cream)] p-2 text-sm font-bold">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="relative bg-[color:var(--lp-cherry)]">
          <Torn color="var(--lp-cream)" flip />
          <TagPattern />
          <div className="relative mx-auto max-w-4xl px-5 py-20 text-center">
            <h2 className="lp-tag text-6xl sm:text-8xl">Prêt à chasser ?</h2>
            <Link to="/auth" className="lp-box mt-10 inline-flex min-h-14 items-center gap-3 rounded-lg bg-[color:var(--lp-lime)] px-8 text-sm font-black uppercase italic transition hover:-translate-y-1">
              Créer mon compte <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative">
        <Torn color="var(--lp-cherry)" flip />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs font-black uppercase italic text-[color:var(--lp-cream)] sm:flex-row">
          <span>Cansdex — la collection commence avec une canette</span>
          <div className="flex gap-5"><Link to="/auth">Connexion</Link><Link to="/brands">Catalogue</Link></div>
        </div>
      </footer>
    </div>
  );
}
