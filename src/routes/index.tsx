import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Ghost, Library, ScanLine, Trophy, Users, Zap } from "lucide-react";
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

const perks = [
  { icon: ScanLine, title: "Scan éclair", text: "Un code-barres et la canette est retrouvée." },
  { icon: Library, title: "Mur légendaire", text: "Chaque design, chaque édition, rangés." },
  { icon: Trophy, title: "Succès épiques", text: "Débloque des badges et monte de niveau." },
  { icon: Users, title: "Zéro solo", text: "Partage tes trouvailles avec la commu." },
];

const stats = [
  { value: "100+", label: "Marques & modèles" },
  { value: "30+", label: "Succès à débloquer" },
  { value: "3", label: "États par canette" },
  { value: "∞", label: "Designs à chasser" },
];

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/collection", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="lp lp-clouds min-h-screen overflow-hidden text-[color:var(--lp-ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2" aria-label="Cansdex, accueil">
          <span className="lp-box grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--lp-cream)]"><Ghost className="h-5 w-5" /></span>
          <span className="lp-sticker text-3xl">Cansdex</span>
        </Link>
        <Link to="/auth" className="lp-box inline-flex items-center gap-2 rounded-full bg-[color:var(--lp-peach)] px-5 py-2.5 text-sm font-black uppercase italic transition hover:-translate-y-0.5">
          Rejoindre <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-2">
          <div className="space-y-7">
            {[
              { icon: Zap, word: "Legendary collection" },
              { icon: ScanLine, word: "Epic scan" },
              { icon: Trophy, word: "Zéro limite" },
            ].map(({ icon: Icon, word }, i) => (
              <div key={word} className={`flex items-center gap-4 ${i % 2 ? "flex-row-reverse text-right" : ""}`}>
                <span className="lp-box grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[color:var(--lp-cream)]"><Icon className="h-8 w-8" strokeWidth={2.5} /></span>
                <div className="flex-1">
                  <p className="lp-sticker text-4xl sm:text-5xl">{word}</p>
                  <div className="lp-ink-line mt-2" />
                </div>
              </div>
            ))}
            <p className="max-w-md text-base font-semibold leading-7">
              Scanne tes trouvailles, collectionne chaque design et complète le mur de canettes le plus légendaire.
            </p>
            <Link to="/auth" className="lp-box inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[color:var(--lp-ink)] px-8 text-sm font-black uppercase italic text-[color:var(--lp-cream)] transition hover:-translate-y-1">
              Lancer ma collection <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {/* Peach can */}
          <div className="relative mx-auto h-[460px] w-full max-w-sm">
            <div className="absolute left-1/2 top-1/2 h-[420px] w-[180px] -translate-x-1/2 -translate-y-1/2 rotate-[8deg] overflow-hidden rounded-[34px] border-[4px] border-[color:var(--lp-ink)] bg-[color:var(--lp-peach-soft)] shadow-[10px_10px_0_var(--lp-ink)]">
              <div className="absolute inset-x-0 top-0 h-10 bg-[color:var(--lp-peach)]" />
              <p className="absolute inset-x-0 top-2 text-center text-sm font-black italic uppercase">Energy</p>
              <div className="absolute inset-0 top-10 opacity-25 [background:repeating-linear-gradient(-30deg,var(--lp-peach)_0_10px,transparent_10px_22px)]" />
              <p className="lp-sticker absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-7xl">Cansdex</p>
              <div className="absolute inset-x-0 bottom-0 h-20 bg-[color:var(--lp-peach)] [clip-path:polygon(0_25%,100%_0,100%_100%,0_100%)]" />
              <p className="lp-sticker absolute inset-x-0 bottom-4 text-center text-2xl">Peaches</p>
            </div>
            <span className="lp-box absolute left-0 top-8 -rotate-12 rounded-full bg-[color:var(--lp-cream)] px-4 py-2 text-xs font-black uppercase italic">Collect. Repeat.</span>
            <span className="lp-box absolute bottom-10 right-0 rotate-6 rounded-full bg-[color:var(--lp-peach)] px-4 py-2 text-xs font-black uppercase italic">0 limite</span>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="lp-box grid grid-cols-2 bg-[color:var(--lp-ink)] p-[3px] gap-[3px] md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-[color:var(--lp-sky)] px-4 py-6 text-center">
                <p className="lp-sticker text-5xl">{s.value}</p>
                <p className="mt-2 text-xs font-black uppercase">{s.label}</p>
              </div>
            ))}
            <p className="col-span-full bg-[color:var(--lp-ink)] py-1.5 text-center text-xs font-black uppercase tracking-widest text-[color:var(--lp-cream)]">Cansdex full disclosure label</p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map(({ icon: Icon, title, text }, i) => (
            <article key={title} className={`lp-box rounded-3xl p-6 transition hover:-translate-y-1 ${i % 2 ? "bg-[color:var(--lp-peach)]" : "bg-[color:var(--lp-cream)]"}`}>
              <Icon className="h-10 w-10" strokeWidth={2.5} />
              <h3 className="lp-sticker mt-6 text-3xl">{title}</h3>
              <p className="mt-2 text-sm font-semibold">{text}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-20 text-center">
          <h2 className="lp-sticker text-5xl sm:text-7xl">Prêt à partir à la chasse ?</h2>
          <Link to="/auth" className="lp-box mt-8 inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[color:var(--lp-peach)] px-8 text-sm font-black uppercase italic transition hover:-translate-y-1">
            Créer mon compte <ArrowRight className="h-5 w-5" />
          </Link>
        </section>
      </main>

      <footer className="border-t-[3px] border-[color:var(--lp-ink)] bg-[color:var(--lp-ink)] px-5 py-6 text-[color:var(--lp-cream)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs font-black uppercase italic sm:flex-row">
          <span>Cansdex — la collection commence avec une canette</span>
          <div className="flex gap-5"><Link to="/auth">Connexion</Link><Link to="/brands">Catalogue</Link></div>
        </div>
      </footer>
    </div>
  );
}
