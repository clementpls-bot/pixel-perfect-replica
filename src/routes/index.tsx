import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowDown, ArrowRight, Barcode, Check, CircleDot,
  Library, ScanLine, Sparkles, Star, Trophy, Users, Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cansdex — La chasse est ouverte." },
      { name: "description", content: "Scanne, collectionne, complète. Cansdex est le terrain de jeu des collectionneurs de canettes." },
      { property: "og:title", content: "Cansdex — La chasse est ouverte." },
      { property: "og:description", content: "Toutes les canettes. Une seule collection. À toi de jouer." },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    number: "01",
    icon: ScanLine,
    title: "SCAN. C'EST DANS LA BOÎTE.",
    copy: "Un code-barres, un scan, et ta trouvaille rejoint ta collection. Simple, rapide, efficace.",
    tag: "LE REFLEXE",
    color: "lime",
  },
  {
    number: "02",
    icon: Library,
    title: "FAIS GRANDIR TON MUR.",
    copy: "Retrouve tes canettes, explore les marques et garde une trace de toutes tes découvertes.",
    tag: "TA COLLECTION",
    color: "purple",
  },
  {
    number: "03",
    icon: Trophy,
    title: "COMPLÈTE. DÉBLOQUE. RECOMMENCE.",
    copy: "Suis ta progression, repère les modèles manquants et transforme chaque chasse en défi.",
    tag: "LE CHALLENGE",
    color: "orange",
  },
];

function CanIllustration({ variant, label, sublabel, className = "" }: {
  variant: "purple" | "lime" | "orange";
  label: string;
  sublabel: string;
  className?: string;
}) {
  return (
    <div className={`can-stage can-stage-${variant} ${className}`}>
      <div className="can-tab" />
      <div className="can-body">
        <div className="can-topline" />
        <span className="can-mini">CANSDEX® · COLLECTOR SERIES</span>
        <span className="can-wordmark">{label}</span>
        <span className="can-subtitle">{sublabel}</span>
        <span className="can-burst">100%<br />COLLECT</span>
        <div className="can-bottomline" />
        <span className="can-volume">330 ML · THE COLLECTION</span>
      </div>
      <div className="can-foot" />
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
    <div className="cansdex-landing min-h-screen overflow-hidden bg-[#f5f2e9] text-[#171717]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bowlby+One+SC&family=DM+Sans:wght@400;500;600;700;800;900&family=Permanent+Marker&display=swap');
        .cansdex-landing { --ink:#171717; --paper:#f5f2e9; --acid:#d5ff32; --violet:#8660ff; --orange:#ff713d; font-family:'DM Sans',sans-serif; }
        .cansdex-landing .comic { font-family:'Bowlby One SC',Impact,sans-serif; letter-spacing:-.045em; }
        .cansdex-landing .marker { font-family:'Permanent Marker',cursive; }
        .cansdex-landing .ink-outline { text-shadow: 3px 3px 0 var(--ink),-1px -1px 0 var(--ink),1px -1px 0 var(--ink),-1px 1px 0 var(--ink),1px 1px 0 var(--ink); }
        .cansdex-landing .halftone { background-image:radial-gradient(#171717 1px,transparent 1.5px);background-size:8px 8px; }
        .cansdex-landing .comic-shadow { box-shadow:6px 6px 0 #171717; }
        .cansdex-landing .comic-shadow-sm { box-shadow:4px 4px 0 #171717; }
        .cansdex-landing .sticker { border:2px solid #171717; border-radius:999px; box-shadow:4px 4px 0 #171717; }
        .cansdex-landing .can-stage { position:relative; width:150px; height:340px; filter:drop-shadow(9px 13px 0 rgba(0,0,0,.18)); }
        .cansdex-landing .can-body { position:absolute; inset:12px 7px 10px; overflow:hidden; border:3px solid #171717; border-radius:24px 24px 29px 29px; display:flex;align-items:center;flex-direction:column; }
        .cansdex-landing .can-stage-purple .can-body { background:linear-gradient(110deg,#5a35d6 0%,#9c79ff 42%,#5632d0 100%);color:white; }
        .cansdex-landing .can-stage-lime .can-body { background:linear-gradient(110deg,#a3d900 0%,#e0ff58 44%,#8dbb00 100%);color:#171717; }
        .cansdex-landing .can-stage-orange .can-body { background:linear-gradient(110deg,#e64a25 0%,#ff9864 45%,#d83d21 100%);color:white; }
        .cansdex-landing .can-tab { position:absolute;z-index:2;top:4px;left:50%;transform:translateX(-50%);width:43px;height:13px;border:3px solid #171717;border-radius:9px 9px 4px 4px;background:#d4d0c7; }
        .cansdex-landing .can-foot { position:absolute;bottom:3px;left:20px;right:20px;height:8px;border:2px solid #171717;border-radius:0 0 10px 10px;background:#c6c1b7; }
        .cansdex-landing .can-topline,.cansdex-landing .can-bottomline { width:100%;height:7px;background:rgba(255,255,255,.25);border-block:2px solid #171717; }
        .cansdex-landing .can-mini { margin-top:25px;font-size:7px;font-weight:900;letter-spacing:.11em; }
        .cansdex-landing .can-wordmark { margin-top:43px;font-family:'Bowlby One SC',Impact,sans-serif;font-size:27px;line-height:.9;text-align:center;letter-spacing:-.07em;transform:rotate(-7deg);text-shadow:2px 2px 0 rgba(0,0,0,.22); }
        .cansdex-landing .can-subtitle { margin-top:9px;font-size:8px;font-weight:900;letter-spacing:.18em; }
        .cansdex-landing .can-burst { position:absolute;right:7px;bottom:48px;display:grid;place-items:center;width:57px;height:57px;clip-path:polygon(50% 0%,61% 13%,78% 5%,82% 24%,100% 31%,88% 48%,100% 64%,80% 72%,78% 94%,59% 86%,47% 100%,36% 83%,16% 92%,17% 70%,0 59%,13% 43%,3% 25%,25% 22%,31% 3%);background:#d5ff32;color:#171717;font-size:10px;font-weight:1000;text-align:center;line-height:1.05;transform:rotate(10deg); }
        .cansdex-landing .can-volume { margin-top:auto;margin-bottom:13px;font-size:6px;font-weight:900;letter-spacing:.12em; }
        .cansdex-landing .ticker-track { display:flex;width:max-content;animation:cansdex-marquee 27s linear infinite; }
        @keyframes cansdex-marquee { from{transform:translateX(0)}to{transform:translateX(-50%)} }
        .cansdex-landing .scribble { text-decoration:underline;text-decoration-color:var(--acid);text-decoration-thickness:7px;text-underline-offset:5px; }
        .cansdex-landing .feature-card { transition:transform .2s ease,box-shadow .2s ease; }
        .cansdex-landing .feature-card:hover { transform:translate(-3px,-4px);box-shadow:9px 9px 0 #171717; }
        @media (prefers-reduced-motion: reduce) { .cansdex-landing .ticker-track{animation:none}.cansdex-landing *{scroll-behavior:auto!important;transition:none!important} }
      `}</style>

      <header className="relative z-20 border-b-[3px] border-[#171717] bg-[#f5f2e9]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <Link to="/" aria-label="Cansdex, accueil" className="flex items-center gap-2">
            <span className="comic flex h-11 w-11 -rotate-6 items-center justify-center rounded-xl border-[3px] border-[#171717] bg-[#d5ff32] text-2xl comic-shadow-sm">C</span>
            <span className="comic text-[25px] leading-none">CANS<span className="text-[#8660ff]">DEX</span><span className="ml-1 align-top font-sans text-[9px]">®</span></span>
          </Link>
          <nav className="hidden items-center gap-8 text-[11px] font-black uppercase tracking-[.16em] md:flex">
            <a href="#concept" className="transition hover:text-[#8660ff]">Le concept</a>
            <a href="#features" className="transition hover:text-[#8660ff]">Comment ça marche</a>
            <a href="#community" className="transition hover:text-[#8660ff]">La communauté</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden px-3 py-2 text-xs font-black uppercase tracking-wider transition hover:text-[#8660ff] sm:inline-flex">Connexion</Link>
            <Link to="/auth" className="comic-shadow-sm inline-flex items-center gap-2 rounded-lg border-[2px] border-[#171717] bg-[#d5ff32] px-4 py-2.5 text-[11px] font-black uppercase tracking-wide transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none">Rejoins le crew <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b-[3px] border-[#171717] bg-[#f5f2e9]">
          <div className="pointer-events-none absolute -right-20 top-0 h-[580px] w-[580px] rounded-full bg-[#d5ff32] opacity-60 blur-[1px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-[48%] halftone opacity-[.12]" />
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.04fr_.96fr] lg:px-12 lg:py-24">
            <div className="relative z-10 max-w-[760px]">
              <div className="mb-7 inline-flex -rotate-2 items-center gap-2 border-[2px] border-[#171717] bg-white px-4 py-2 comic-shadow-sm">
                <Zap className="h-4 w-4 fill-[#ff713d] text-[#ff713d]" />
                <span className="text-[10px] font-black uppercase tracking-[.2em]">Le terrain de jeu des collectionneurs</span>
              </div>
              <h1 className="comic text-[clamp(3.5rem,8.5vw,7.7rem)] leading-[.88]">
                <span className="block">CANETTES</span>
                <span className="ink-outline block text-[#d5ff32]">À GOGO.</span>
                <span className="block text-[#8660ff]">COLLECTION</span>
                <span className="block">SANS LIMITE<span className="text-[#ff713d]">!</span></span>
              </h1>
              <div className="mt-8 flex max-w-xl items-start gap-4">
                <span className="mt-1 h-12 w-2 shrink-0 rotate-2 bg-[#ff713d]" />
                <p className="max-w-lg text-base font-semibold leading-7 sm:text-lg">La canette que tu cherches depuis des mois ? Celle que tu viens de trouver au coin de la rue ? <strong>Elle a sa place ici.</strong></p>
              </div>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth" className="comic-shadow inline-flex min-h-14 items-center justify-center gap-3 border-[3px] border-[#171717] bg-[#8660ff] px-7 text-sm font-black uppercase tracking-wide text-white transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                  Je lance ma collection <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#concept" className="inline-flex min-h-14 items-center justify-center gap-2 border-[3px] border-[#171717] bg-white px-6 text-xs font-black uppercase tracking-wide transition hover:bg-[#d5ff32]">
                  C'est quoi Cansdex ? <ArrowDown className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-black uppercase tracking-wider text-[#5d594f]">
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-[#608b00]" /> Gratuit pour commencer</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-[#608b00]" /> Fait par des passionnés</span>
              </div>
            </div>

            <div className="relative mx-auto flex min-h-[450px] w-full max-w-[600px] items-center justify-center sm:min-h-[560px]">
              <div className="absolute left-[12%] top-[12%] h-64 w-64 rounded-full border-[3px] border-dashed border-[#171717]/30 sm:h-80 sm:w-80" />
              <div className="absolute left-[20%] top-[18%] h-64 w-64 rounded-full bg-[#8660ff] sm:h-80 sm:w-80" />
              <div className="absolute right-[8%] top-[10%] rotate-12 text-5xl text-[#171717] sm:text-7xl">✳</div>
              <div className="absolute bottom-[13%] left-[3%] -rotate-12 rounded-full border-[3px] border-[#171717] bg-[#ff713d] px-4 py-3 text-center text-[10px] font-black uppercase leading-tight text-white comic-shadow-sm">FIND<br />YOUR<br />NEXT!</div>
              <CanIllustration variant="purple" label="CANS" sublabel="POWER YOUR WALL" className="relative z-10 -mr-7 mt-8 rotate-[-13deg] scale-[.82] sm:scale-100" />
              <CanIllustration variant="lime" label="DEX!" sublabel="COLLECT THEM ALL" className="relative z-20 -ml-7 -mt-8 rotate-[10deg] scale-[.94] sm:scale-110" />
              <div className="absolute right-[3%] top-[7%] z-30 -rotate-12 rounded-full border-[3px] border-[#171717] bg-[#d5ff32] px-4 py-3 text-center comic-shadow-sm">
                <p className="marker text-lg leading-none">Gotta</p><p className="comic text-sm">COLLECT 'EM!</p>
              </div>
              <div className="absolute bottom-[7%] right-[6%] z-30 rotate-6 border-[3px] border-[#171717] bg-white px-4 py-2 comic-shadow-sm">
                <p className="comic text-sm">NO CAN LEFT BEHIND.</p>
              </div>
              <div className="absolute left-[8%] top-[4%] z-30 text-4xl">✦</div>
              <div className="absolute bottom-[12%] right-[12%] z-30 text-5xl text-[#ff713d]">✳</div>
            </div>
          </div>
          <div className="border-t-[3px] border-[#171717] bg-[#d5ff32] py-3">
            <div className="ticker-track items-center gap-8 whitespace-nowrap">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex items-center gap-8">
                  {["SCAN IT", "OWN IT", "COLLECT IT", "SHOW IT OFF", "REPEAT"].map((word) => (
                    <span key={word} className="comic flex items-center gap-8 text-xl sm:text-2xl">{word}<Star className="h-5 w-5 fill-[#171717]" /></span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="concept" className="relative border-b-[3px] border-[#171717] bg-white px-5 py-20 sm:px-8 sm:py-28">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 halftone opacity-[.08] md:block" />
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <p className="marker mb-4 -rotate-2 text-xl text-[#8660ff]">Hey, collector!</p>
              <h2 className="comic text-5xl leading-[.98] sm:text-6xl">CE N'EST PAS<br />JUSTE UNE<br /><span className="text-[#8660ff]">CANETTE.</span></h2>
              <p className="mt-7 max-w-lg text-base font-medium leading-8 text-[#514e48]">C'est une trouvaille. Un souvenir. Une édition introuvable. Une canette venue de l'autre bout du monde. Cansdex rassemble tout ce petit monde dans une collection qui ne demande qu'à grandir.</p>
              <Link to="/auth" className="mt-8 inline-flex items-center gap-2 border-b-[3px] border-[#d5ff32] pb-1 text-xs font-black uppercase tracking-wider hover:border-[#8660ff]">Créer mon espace <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="relative grid grid-cols-2 gap-3 sm:gap-5">
              <div className="comic-shadow-sm rotate-[-3deg] border-[3px] border-[#171717] bg-[#d5ff32] p-5 sm:p-7">
                <Barcode className="h-8 w-8" />
                <p className="comic mt-10 text-3xl leading-none sm:text-4xl">CHAQUE<br />MODÈLE.</p>
                <p className="mt-4 text-xs font-bold">Une fiche, une histoire, une place dans le catalogue.</p>
              </div>
              <div className="comic-shadow-sm mt-12 rotate-[3deg] border-[3px] border-[#171717] bg-[#ff713d] p-5 text-white sm:p-7">
                <CircleDot className="h-8 w-8" />
                <p className="comic mt-10 text-3xl leading-none sm:text-4xl">CHAQUE<br />TROUVAILLE.</p>
                <p className="mt-4 text-xs font-bold">Garde la trace de tout ce que tu déniches.</p>
              </div>
              <div className="col-span-2 -mt-1 flex items-center justify-center gap-3 border-[3px] border-[#171717] bg-[#8660ff] px-5 py-4 text-white comic-shadow-sm">
                <Sparkles className="h-6 w-6 shrink-0" />
                <p className="comic text-xl sm:text-2xl">UNE COLLECTION QUI TE RESSEMBLE.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-b-[3px] border-[#171717] bg-[#f5f2e9] px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="marker -rotate-2 text-xl text-[#ff713d]">How to play</p>
                <h2 className="comic mt-3 text-5xl leading-none sm:text-6xl">3 MOVES.<br /><span className="text-[#8660ff]">INFINITE</span> CANETTES.</h2>
              </div>
              <p className="max-w-sm text-sm font-semibold leading-7 text-[#5d594f]">Pas besoin d'un mode d'emploi de 40 pages. Tu connais les règles : trouve, ajoute, collectionne.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {features.map(({ number, icon: Icon, title, copy, tag, color }) => (
                <article key={number} className={`feature-card comic-shadow relative border-[3px] border-[#171717] p-6 sm:p-8 ${color === "lime" ? "bg-[#d5ff32]" : color === "purple" ? "bg-[#8660ff] text-white" : "bg-[#ff713d] text-white"}`}>
                  <div className="flex items-start justify-between">
                    <span className="comic text-5xl opacity-35">{number}</span>
                    <span className="grid h-12 w-12 place-items-center rounded-full border-[2px] border-current"><Icon className="h-6 w-6" /></span>
                  </div>
                  <p className="marker mt-8 text-sm">{tag}</p>
                  <h3 className="comic mt-2 text-3xl leading-[.98]">{title}</h3>
                  <p className="mt-5 text-sm font-semibold leading-7 opacity-85">{copy}</p>
                  <div className="mt-8 flex items-center justify-between border-t-2 border-current/30 pt-4 text-[10px] font-black uppercase tracking-[.16em]"><span>LEVEL UP</span><ArrowRight className="h-5 w-5" /></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b-[3px] border-[#171717] bg-[#171717] px-5 py-20 text-white sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[1fr_.9fr]">
            <div>
              <p className="marker -rotate-2 text-xl text-[#d5ff32]">Your wall. Your rules.</p>
              <h2 className="comic mt-4 text-5xl leading-[.95] sm:text-7xl">TON MUR.<br /><span className="text-[#d5ff32]">TES RÈGLES.</span></h2>
              <p className="mt-7 max-w-lg text-base font-medium leading-8 text-white/70">Ta collection évolue avec toi. Visualise tes canettes, tes marques, tes doublons et tes prochaines cibles. Chaque nouvelle pièce te rapproche du mur parfait.</p>
              <Link to="/auth" className="comic-shadow mt-8 inline-flex min-h-14 items-center gap-3 border-[3px] border-[#171717] bg-[#d5ff32] px-6 text-xs font-black uppercase tracking-wide text-[#171717] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none">Construire mon mur <ArrowRight className="h-5 w-5" /></Link>
            </div>
            <div className="relative mx-auto w-full max-w-[510px] rotate-2 border-[3px] border-[#171717] bg-[#f5f2e9] p-4 text-[#171717] comic-shadow sm:p-6">
              <div className="flex items-center justify-between border-b-[3px] border-[#171717] pb-3">
                <div className="flex items-center gap-2"><span className="comic grid h-8 w-8 place-items-center rounded-lg bg-[#d5ff32]">C</span><span className="comic text-sm">MY CANS WALL</span></div>
                <span className="marker text-xs text-[#8660ff]">collector mode</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[["24","CANETTES"],["08","MARQUES"],["62%","COMPLÉTÉ"]].map(([value,label]) => <div key={label} className="border-2 border-[#171717] bg-white p-3 text-center"><p className="comic text-2xl sm:text-3xl">{value}</p><p className="mt-1 text-[8px] font-black tracking-wider">{label}</p></div>)}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <CanIllustration variant="purple" label="X" sublabel="ENERGY" className="mx-auto scale-[.42] origin-top" />
                <CanIllustration variant="lime" label="GO!" sublabel="FRESH" className="mx-auto scale-[.42] origin-top" />
                <CanIllustration variant="orange" label="POP" sublabel="SODA" className="mx-auto scale-[.42] origin-top" />
                <div className="flex h-[145px] items-center justify-center border-2 border-dashed border-[#171717]/40 bg-white"><span className="comic text-4xl text-[#8660ff]">?</span></div>
              </div>
              <div className="mt-[-48px] flex items-center justify-between border-t-[3px] border-[#171717] pt-3 text-[9px] font-black uppercase tracking-widest"><span>YOUR COLLECTION, YOUR STORY</span><span>01 / 99+</span></div>
            </div>
          </div>
        </section>

        <section id="community" className="relative overflow-hidden bg-[#ff713d] px-5 py-20 sm:px-8 sm:py-28">
          <div className="pointer-events-none absolute -right-12 -top-16 text-[240px] leading-none text-white/10">✳</div>
          <div className="relative mx-auto max-w-[1050px] text-center">
            <div className="sticker mx-auto inline-flex rotate-[-5deg] items-center gap-2 bg-[#d5ff32] px-4 py-2 text-[10px] font-black uppercase tracking-widest"><Users className="h-4 w-4" /> La communauté Cansdex</div>
            <h2 className="comic mt-8 text-5xl leading-[.95] text-white sm:text-7xl">LES BONNES<br />TROUVAILLES<br /><span className="ink-outline text-[#d5ff32]">SE PARTAGENT.</span></h2>
            <p className="mx-auto mt-7 max-w-xl text-sm font-bold leading-7 text-white/90 sm:text-base">Une édition rare ? Une canette venue de loin ? Une découverte improbable ? Fais grandir le catalogue avec les autres collectionneurs.</p>
            <Link to="/auth" className="comic-shadow mt-9 inline-flex min-h-14 items-center gap-3 border-[3px] border-[#171717] bg-white px-7 text-xs font-black uppercase tracking-wide text-[#171717] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none">Rejoindre le mouvement <ArrowRight className="h-5 w-5" /></Link>
          </div>
        </section>

        <section className="border-b-[3px] border-[#171717] bg-[#d5ff32] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
            <div><p className="marker text-lg">One more thing...</p><h2 className="comic mt-2 text-4xl leading-none sm:text-5xl">ALORS, ON S'Y MET ?</h2><p className="mt-4 text-sm font-bold">Ta prochaine canette t'attend quelque part.</p></div>
            <Link to="/auth" className="comic-shadow inline-flex min-h-14 shrink-0 items-center gap-3 border-[3px] border-[#171717] bg-[#8660ff] px-8 text-xs font-black uppercase tracking-wider text-white transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none">Créer mon compte <ArrowRight className="h-5 w-5" /></Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#171717] px-5 py-8 text-white sm:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-5 sm:flex-row">
          <Link to="/" className="flex items-center gap-2"><span className="comic flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white bg-[#d5ff32] text-lg text-[#171717]">C</span><span className="comic text-lg">CANS<span className="text-[#d5ff32]">DEX</span></span></Link>
          <p className="text-center text-[10px] font-bold uppercase tracking-[.18em] text-white/50">SCAN IT. OWN IT. COLLECT IT.</p>
          <div className="flex gap-5 text-[10px] font-black uppercase tracking-wider"><Link to="/auth" className="hover:text-[#d5ff32]">Connexion</Link><Link to="/brands" className="hover:text-[#d5ff32]">Catalogue</Link></div>
        </div>
        <p className="mt-7 text-center text-[9px] font-semibold text-white/30">© {new Date().getFullYear()} Cansdex. Fait pour les collectionneurs.</p>
      </footer>
    </div>
  );
}
