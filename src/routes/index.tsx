import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowDown, ArrowRight, Camera, Check, Compass, MessageCircle,
  ScanBarcode, Sparkles, Star, Trophy, Users, WandSparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCatalog } from "@/lib/data";
import { CanArt } from "@/components/CanArt";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cansdex — Chaque canette mérite sa place" },
      { name: "description", content: "Scanne, découvre et collectionne les canettes. Explore un catalogue vivant, suis tes trouvailles et partage ta passion avec la communauté Cansdex." },
      { property: "og:title", content: "Cansdex — Chaque canette mérite sa place" },
      { property: "og:description", content: "Scanne, découvre et collectionne les canettes. Ton mur, ton catalogue, ta communauté." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const WORDS = "COLLECT · SCAN · DISCOVER · KEEP · ";

function TagPattern() {
  return <div className="lp-pattern" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <div key={i}>{WORDS.repeat(5)}</div>)}</div>;
}

function Torn({ color, flip }: { color: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className={`relative z-10 block h-5 w-full sm:h-8 ${flip ? "rotate-180" : ""}`} aria-hidden="true">
      <path d="M0 40 L0 18 L60 26 L110 8 L170 22 L230 12 L300 30 L350 14 L420 24 L480 4 L540 20 L610 10 L680 28 L740 12 L810 22 L870 6 L940 26 L1000 14 L1070 24 L1130 8 L1200 20 L1200 40Z" fill={color} stroke="var(--lp-cream)" strokeWidth="3" />
    </svg>
  );
}

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data } = useCatalog();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/collection", replace: true });
  }, [loading, user, navigate]);

  const featuredCans = (data?.cans ?? []).filter((can) => can.image_url).slice(0, 4);
  const brandCount = data?.brands.length;
  const canCount = data?.cans.length;

  return (
    <div className="lp min-h-screen overflow-hidden bg-[color:var(--lp-ink)] text-[color:var(--lp-ink)]">
      <header className="relative z-20 bg-[color:var(--lp-grape-deep)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="lp-logo" aria-label="Cansdex, accueil">cansdex<span>.</span></Link>
          <nav className="hidden items-center gap-7 text-sm font-extrabold text-[color:var(--lp-cream)] md:flex">
            <a href="#concept" className="transition hover:text-[color:var(--lp-lime)]">Le concept</a>
            <a href="#catalogue" className="transition hover:text-[color:var(--lp-lime)]">Le catalogue</a>
            <a href="#communaute" className="transition hover:text-[color:var(--lp-lime)]">La communauté</a>
          </nav>
          <Link to="/auth" className="lp-box inline-flex items-center gap-2 rounded-xl bg-[color:var(--lp-cream)] px-4 py-2.5 text-xs font-black uppercase tracking-wide transition hover:-translate-y-0.5">
            Se connecter <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="lp-splat relative bg-[color:var(--lp-grape)]">
          <Torn color="var(--lp-grape-deep)" flip />
          <TagPattern />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 md:grid-cols-[1.05fr_.95fr] md:pb-28 md:pt-16">
            <div className="relative z-10">
              <p className="lp-kicker"><span className="lp-kicker-dot" /> Le terrain de jeu des collectionneurs</p>
              <h1 className="lp-display mt-6 max-w-3xl text-6xl sm:text-7xl lg:text-[6.6rem]">Chaque canette<br /><span>a son histoire.</span></h1>
              <p className="mt-7 max-w-xl text-base font-semibold leading-7 text-[color:var(--lp-cream)] sm:text-lg sm:leading-8">
                La référence que tu as goûtée, le design que tu cherches, l’édition que tu n’avais jamais vue… Retrouve-les, ajoute-les à ton mur et construis une collection qui te ressemble.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth" className="lp-box inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[color:var(--lp-lime)] px-7 text-sm font-black uppercase tracking-wide transition hover:-translate-y-1">
                  Créer ma collection <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#concept" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-white/35 px-6 text-sm font-extrabold text-white transition hover:bg-white/10">
                  Découvrir Cansdex <ArrowDown className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-5 text-xs font-bold text-white/70">Une collection personnelle. Un catalogue à explorer. Une passion à partager.</p>
            </div>

            <div className="relative mx-auto w-full max-w-[540px]">
              <div className="lp-hero-orbit" aria-hidden="true" />
              <div className="lp-hero-note lp-hero-note-top"><ScanBarcode className="h-4 w-4" /> SCAN. IDENTIFIE. AJOUTE.</div>
              <div className="lp-hero-cans">
                {featuredCans.length > 0 ? featuredCans.slice(0, 3).map((can, i) => {
                  const brand = data?.brands.find((item) => item.id === can.brand_id);
                  return (
                    <Link key={can.id} to="/cans/$id" params={{ id: can.id }} className={`lp-real-can lp-real-can-${i}`} aria-label={`Découvrir ${can.name}`}>
                      <CanArt can={can} brandName={brand?.name} className="max-w-[118px] sm:max-w-[145px]" />
                      <span>{brand?.name ?? can.name}</span>
                    </Link>
                  );
                }) : <div className="lp-can-placeholder"><span>🥫</span><b>TA PROCHAINE TROUVAILLE</b></div>}
              </div>
              <div className="lp-hero-note lp-hero-note-bottom"><Sparkles className="h-4 w-4" /> TON MUR, TES RÈGLES.</div>
              <span className="lp-burst" aria-hidden="true">COLLECT<br />THEM!</span>
            </div>
          </div>
        </section>

        <section className="relative bg-[color:var(--lp-blue)]">
          <Torn color="var(--lp-grape)" flip />
          <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-3 px-5 py-10 sm:grid-cols-4 sm:px-8 sm:py-12">
            <div className="lp-stat"><strong>{canCount == null ? "…" : canCount.toLocaleString("fr-FR")}</strong><span>canettes référencées</span></div>
            <div className="lp-stat"><strong>{brandCount == null ? "…" : brandCount.toLocaleString("fr-FR")}</strong><span>marques à explorer</span></div>
            <div className="lp-stat"><strong><ScanBarcode className="h-8 w-8" /></strong><span>scan par code-barres</span></div>
            <div className="lp-stat"><strong><Camera className="h-8 w-8" /></strong><span>reconnaissance visuelle</span></div>
          </div>
        </section>

        <section id="concept" className="lp-splat relative bg-[color:var(--lp-cream)]">
          <Torn color="var(--lp-blue)" flip />
          <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="mb-12 max-w-2xl">
              <p className="lp-section-kicker">01 — Le principe</p>
              <h2 className="lp-section-title mt-3">Pas juste une canette.<br /><span>Une pièce de ta collection.</span></h2>
              <p className="mt-5 text-base font-semibold leading-7 text-black/65">Cansdex transforme les canettes du quotidien en découvertes à retrouver, classer et collectionner. Chaque design compte : les variantes, les éditions et les détails font partie de l’aventure.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <article className="lp-feature-card bg-[color:var(--lp-peach)]">
                <div className="lp-feature-icon"><ScanBarcode /></div>
                <span className="lp-feature-number">01</span>
                <h3>Tu scannes</h3>
                <p>Un code-barres, une photo ou une recherche dans le catalogue : retrouve la bonne canette et identifie sa référence.</p>
                <div className="lp-feature-foot"><Check /> Identification simple, ajout rapide</div>
              </article>
              <article className="lp-feature-card bg-[color:var(--lp-lime)]">
                <div className="lp-feature-icon"><Star /></div>
                <span className="lp-feature-number">02</span>
                <h3>Tu collectionnes</h3>
                <p>Ajoute-la à ton mur personnel. Garde une trace de tes trouvailles, de tes exemplaires et de tes Drinks.</p>
                <div className="lp-feature-foot"><Check /> Un mur qui évolue avec toi</div>
              </article>
              <article className="lp-feature-card bg-[color:var(--lp-sky)]">
                <div className="lp-feature-icon"><Compass /></div>
                <span className="lp-feature-number">03</span>
                <h3>Tu explores</h3>
                <p>Parcours les marques, découvre les fiches détaillées, compare les designs et complète les collections qui te tentent.</p>
                <div className="lp-feature-foot"><Check /> Un catalogue vivant à parcourir</div>
              </article>
            </div>
          </div>
        </section>

        <section id="catalogue" className="relative bg-[color:var(--lp-lime)]">
          <Torn color="var(--lp-cream)" flip />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 md:grid-cols-[.9fr_1.1fr] md:py-24">
            <div>
              <p className="lp-section-kicker">02 — Le catalogue</p>
              <h2 className="lp-section-title mt-3">Du classique<br />à l’introuvable.</h2>
              <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-black/70">Red Bull, Monster, Coca-Cola et bien d’autres univers : explore les marques, retrouve leurs références et repère ce qu’il te manque. Les fiches rassemblent les informations utiles, les visuels et les variantes connues.</p>
              <Link to="/brands" className="lp-box mt-8 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[color:var(--lp-cream)] px-6 text-sm font-black uppercase transition hover:-translate-y-1">Explorer le catalogue <ArrowRight className="h-5 w-5" /></Link>
            </div>
            <div className="lp-catalog-window">
              <div className="lp-window-bar"><span /><span /><span /><b>LE CATALOGUE CANSDEX</b></div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:gap-4 sm:p-6">
                {(featuredCans.length ? featuredCans : (data?.cans ?? []).slice(0, 4)).slice(0, 4).map((can) => {
                  const brand = data?.brands.find((item) => item.id === can.brand_id);
                  return <Link key={can.id} to="/cans/$id" params={{ id: can.id }} className="lp-catalog-can">
                    <div className="flex h-36 items-center justify-center rounded-xl bg-white/75 p-2"><CanArt can={can} brandName={brand?.name} className="h-full max-w-[64px]" /></div>
                    <b>{can.name}</b><span>{brand?.name ?? "Collection"}</span>
                  </Link>;
                })}
                {!data && <div className="col-span-4 py-12 text-center text-sm font-bold">Chargement du catalogue…</div>}
              </div>
              <div className="lp-window-footer"><span>DESIGN · VARIANTES · ÉDITIONS</span><span>À TOI DE JOUER ↗</span></div>
            </div>
          </div>
        </section>

        <section id="communaute" className="lp-splat relative bg-[color:var(--lp-cherry)]">
          <Torn color="var(--lp-lime)" flip />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 md:grid-cols-2 md:py-24">
            <div className="order-2 md:order-1">
              <div className="lp-community-board">
                <div className="lp-board-top"><Users className="h-5 w-5" /><span>LA COMMUNAUTÉ</span><span className="ml-auto lp-live-dot">EN MOUVEMENT</span></div>
                <div className="lp-post">
                  <div className="lp-avatar">C</div><div className="min-w-0 flex-1"><b>Un nouveau design trouvé !</b><span>Une découverte à partager avec les autres collectionneurs.</span></div><MessageCircle className="h-5 w-5 shrink-0" />
                </div>
                <div className="lp-post">
                  <div className="lp-avatar lp-avatar-two"><Trophy className="h-5 w-5" /></div><div className="min-w-0 flex-1"><b>Défis & progression</b><span>Gagne de l’XP en faisant grandir ta collection.</span></div><Sparkles className="h-5 w-5 shrink-0" />
                </div>
                <div className="lp-board-tags"><span>FIL</span><span>CLASSEMENT</span><span>DÉFIS</span></div>
              </div>
            </div>
            <div className="order-1 text-white md:order-2">
              <p className="lp-section-kicker lp-kicker-light">03 — La communauté</p>
              <h2 className="lp-display mt-3 text-5xl sm:text-6xl lg:text-7xl">Collectionner,<br /><span>c’est encore mieux</span><br />ensemble.</h2>
              <p className="mt-6 max-w-xl text-base font-semibold leading-7 text-white/85">Une collection, ça se partage. Publie tes trouvailles, ajoute des photos et des commentaires sur les fiches, découvre celles des autres et mesure ta progression grâce aux niveaux, au classement et aux défis.</p>
              <Link to="/community" className="lp-box mt-8 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[color:var(--lp-cream)] px-6 text-sm font-black uppercase text-black transition hover:-translate-y-1">Rencontrer la communauté <ArrowRight className="h-5 w-5" /></Link>
            </div>
          </div>
        </section>

        <section className="relative bg-[color:var(--lp-blue)]">
          <Torn color="var(--lp-cherry)" flip />
          <div className="relative mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 sm:py-24">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-black bg-[color:var(--lp-lime)] shadow-[4px_4px_0_#111]"><WandSparkles className="h-7 w-7" /></div>
            <p className="lp-section-kicker">À toi de compléter le mur</p>
            <h2 className="lp-display mt-3 text-6xl sm:text-7xl lg:text-8xl">La prochaine<br /><span>trouvaille, c’est la tienne.</span></h2>
            <p className="mx-auto mt-6 max-w-xl text-base font-semibold leading-7 text-black/70">Crée ton compte, commence ton mur et fais de chaque canette une nouvelle découverte.</p>
            <Link to="/auth" className="lp-box mt-9 inline-flex min-h-14 items-center gap-3 rounded-xl bg-[color:var(--lp-lime)] px-8 text-sm font-black uppercase tracking-wide transition hover:-translate-y-1">Je commence ma collection <ArrowRight className="h-5 w-5" /></Link>
          </div>
        </section>
      </main>

      <footer className="relative bg-[color:var(--lp-grape-deep)]">
        <Torn color="var(--lp-blue)" flip />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-7 text-xs font-bold text-white/75 sm:flex-row sm:px-8">
          <Link to="/" className="lp-logo text-3xl">cansdex<span>.</span></Link>
          <p>Chaque canette mérite sa place.</p>
          <div className="flex flex-wrap justify-center gap-5 text-white"><Link to="/auth">Connexion</Link><Link to="/brands">Catalogue</Link><Link to="/community">Communauté</Link></div>
        </div>
      </footer>
    </div>
  );
}
