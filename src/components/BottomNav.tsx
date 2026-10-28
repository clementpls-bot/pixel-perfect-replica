import { Link, useRouterState } from "@tanstack/react-router";
import { Library, MessageCircle, ScanLine, User } from "lucide-react";

const mobileItem = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted-foreground transition-colors";
const desktopItem = "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
const active = { className: "text-primary md:bg-primary/10 md:text-primary" };

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      {/* Mobile navigation stays at the bottom; desktop gets a persistent sidebar. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
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

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-background/90 px-4 py-6 backdrop-blur-xl md:flex">
        <Link to="/collection" className="mb-10 flex items-center gap-3 px-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">C</span>
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">Cansdex</span>
        </Link>
        <div className="mb-2 px-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Explorer</div>
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
          <Link to="/scan" className="can-add-glint flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]">
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
          className="can-add-glint fixed bottom-24 right-5 z-50 flex items-center gap-2.5 rounded-full py-2 pl-2.5 pr-4 text-primary-foreground shadow-glow transition-transform hover:scale-105 active:scale-90 md:hidden"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/15">
            <ScanLine className="h-6 w-6" />
          </span>
          <span className="text-sm font-bold">Ajouter</span>
        </Link>
      )}
    </>
  );
}
