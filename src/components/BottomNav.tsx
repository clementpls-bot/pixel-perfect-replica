import { Link, useRouterState } from "@tanstack/react-router";
import { Library, MessageCircle, ScanLine, User } from "lucide-react";

const mobileItem = "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-white/65 transition-colors";
const desktopItem = "flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-bold text-white/70 transition-all hover:border-white/10 hover:bg-white/10 hover:text-white";
const active = { className: "!text-[#d4f36a] md:!border-[#d4f36a]/30 md:!bg-[#d4f36a]/10 md:!text-[#d4f36a]" };

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      {/* Mobile navigation stays at the bottom; desktop gets a persistent sidebar. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-white/10 bg-[#17151c] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(23,21,28,.18)] md:hidden">
        <div className="mx-auto flex max-w-lg items-end">
          <Link to="/collection" className={mobileItem} activeProps={active}>
            <Library className="h-5 w-5" />
            Mon mur
          </Link>
          <Link to="/community" className={mobileItem} activeProps={active}>
            <MessageCircle className="h-5 w-5" />
            Communauté
          </Link>
          <Link to="/profile" className={mobileItem} activeProps={active}>
            <User className="h-5 w-5" />
            Moi
          </Link>
        </div>
      </nav>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r-2 border-white/10 bg-[#17151c] px-4 py-6 shadow-[8px_0_30px_rgba(23,21,28,.08)] md:flex">
        <Link to="/collection" className="mb-10 flex items-center gap-3 px-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#17151c] bg-[#d4f36a] font-display text-xl text-[#17151c] shadow-[3px_3px_0_#fffaf0]">C</span>
          <span className="font-display text-2xl tracking-tight text-white">Cansdex</span>
        </Link>
        <div className="mb-2 px-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#d4f36a]">Explorer</div>
        <nav className="flex flex-col gap-1">
          <Link to="/collection" className={desktopItem} activeProps={active}>
            <Library className="h-5 w-5" />
            Mon mur
          </Link>
          <Link to="/community" className={desktopItem} activeProps={active}>
            <MessageCircle className="h-5 w-5" />
            Communauté
          </Link>
          <Link to="/profile" className={desktopItem} activeProps={active}>
            <User className="h-5 w-5" />
            Mon profil
          </Link>
        </nav>
        <div className="mt-auto">
          <Link to="/scan" className="can-add-glint flex items-center justify-center gap-2 rounded-xl border-2 border-[#17151c] px-4 py-3 font-extrabold uppercase tracking-wide text-[#17151c] shadow-[4px_4px_0_#fffaf0] transition-transform hover:-translate-y-0.5 active:translate-y-0">
            <ScanLine className="h-5 w-5" />
            Ajouter une canette
          </Link>
        </div>
      </aside>

      {pathname !== "/scan" && pathname !== "/profile" && (
        <Link
          to="/scan"
          aria-label="Ajouter une canette"
          title="Ajouter une canette"
          className="can-add-glint fixed bottom-24 right-5 z-50 flex items-center gap-2.5 rounded-full border-2 border-[#17151c] py-2 pl-2.5 pr-4 font-extrabold text-[#17151c] shadow-[4px_4px_0_#17151c] transition-transform hover:scale-105 active:scale-95 md:hidden"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17151c]/10">
            <ScanLine className="h-6 w-6" />
          </span>
          <span className="text-sm font-bold">Ajouter</span>
        </Link>
      )}
    </>
  );
}
