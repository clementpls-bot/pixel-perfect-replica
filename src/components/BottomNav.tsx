import { Link, useRouterState } from "@tanstack/react-router";
import { Library, MessageCircle, ScanLine, User } from "lucide-react";

const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted-foreground transition-colors";
const desktopItem = "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground";
const active = { className: "text-primary" };

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      {/* Desktop navigation: use the available width instead of keeping the mobile bottom bar. */}
      <header className="fixed inset-x-0 top-0 z-40 hidden border-b bg-background/85 backdrop-blur-xl lg:block">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-8">
          <Link to="/collection" className="font-display text-xl font-extrabold tracking-tight text-foreground">
            Cansdex
          </Link>
          <nav aria-label="Navigation principale" className="flex items-center gap-2">
            <Link to="/collection" className={desktopItem} activeProps={active}>
              <Library className="h-4 w-4" /> Mon mur
            </Link>
            <Link to="/community" className={desktopItem} activeProps={active}>
              <MessageCircle className="h-4 w-4" /> Communauté
            </Link>
            <Link to="/profile" className={desktopItem} activeProps={active}>
              <User className="h-4 w-4" /> Mon profil
            </Link>
          </nav>
        </div>
      </header>

      {/* Keep the existing mobile navigation unchanged on small screens. */}
      <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-lg items-end">
          <Link to="/collection" className={item} activeProps={active}>
            <Library className="h-5 w-5" />
            Mon mur
          </Link>
          <Link to="/community" className={item} activeProps={active}>
            <MessageCircle className="h-5 w-5" />
            Communauté
          </Link>
          <Link to="/profile" className={item} activeProps={active}>
            <User className="h-5 w-5" />
            Moi
          </Link>
        </div>
      </nav>

      {pathname !== "/scan" && pathname !== "/profile" && (
        <Link
          to="/scan"
          aria-label="Ajouter une canette"
          title="Ajouter une canette"
          className="can-add-glint fixed bottom-24 right-5 z-50 flex items-center gap-2.5 rounded-full py-2 pl-2.5 pr-4 text-primary-foreground shadow-glow transition-transform hover:scale-105 active:scale-90 lg:bottom-8 lg:right-8"
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
