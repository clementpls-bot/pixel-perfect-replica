import { Link, useRouterState } from "@tanstack/react-router";
import { Library, MessageCircle, ScanLine, User, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const mobileItem = "nav-mobile-item flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-extrabold text-muted-foreground transition-colors";
const desktopItem = "nav-desktop-item flex items-center gap-3 rounded-lg border-2 border-transparent px-4 py-3 text-sm font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground";
const active = { className: "nav-active" };

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      {/* Mobile navigation stays at the bottom; desktop gets a persistent sidebar. */}
      <nav aria-label="Navigation principale" className="app-navigation fixed inset-x-0 bottom-0 z-40 border-t-2 border-foreground bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
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

      <aside className="app-navigation fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r-2 border-foreground bg-card px-4 py-6 md:flex">
        <Link to="/collection" className="mb-10 flex items-center gap-3 px-3">
          <span className="brand-sticker flex h-10 w-10 items-center justify-center rounded-lg border-2 border-foreground bg-primary font-display text-xl text-foreground">C</span>
          <span className="font-display text-2xl text-foreground">Cansdex<span className="text-pop-coral">.</span></span>
        </Link>
        <div className="mb-2 px-4 text-[10px] font-extrabold uppercase text-muted-foreground">Ta collection, ton univers</div>
        <nav aria-label="Navigation principale" className="flex flex-col gap-2">
          <Link to="/collection" className={desktopItem} activeProps={active}>
            <Library className="h-5 w-5" />
            Mon mur
          </Link>
          <Link to="/community" className={desktopItem} activeProps={active}>
            <MessageCircle className="h-5 w-5" />
            Communauté
          </Link>
          <Link to="/brands" className={desktopItem} activeProps={active}>
            <Compass className="h-5 w-5" />Catalogue
          </Link>
          <Link to="/profile" className={desktopItem} activeProps={active}>
            <User className="h-5 w-5" />
            Mon profil
          </Link>
        </nav>
        <div className="mt-auto">
          <Button asChild className="can-add-glint h-auto w-full whitespace-normal rounded-lg px-3 py-3 font-extrabold">
          <Link to="/scan">
            <ScanLine className="h-5 w-5" />
            Ajouter une canette
          </Link>
          </Button>
        </div>
      </aside>

      {pathname !== "/scan" && pathname !== "/profile" && (
        <Button asChild className="can-add-glint fixed bottom-24 right-5 z-50 h-auto gap-2.5 rounded-xl py-2 pl-2.5 pr-4 font-extrabold md:hidden">
        <Link to="/scan" aria-label="Ajouter une canette" title="Ajouter une canette">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10">
            <ScanLine className="h-6 w-6" />
          </span>
          <span className="text-sm font-bold">Ajouter</span>
        </Link>
        </Button>
      )}
    </>
  );
}
