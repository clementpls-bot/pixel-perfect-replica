import { Link, useRouterState } from "@tanstack/react-router";
import { Library, ScanLine, User } from "lucide-react";

const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted-foreground transition-colors";
const active = { className: "text-primary" };

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-lg items-end">
          <Link to="/collection" className={item} activeProps={active}>
            <Library className="h-5 w-5" />
            Collection
          </Link>
          <Link to="/profile" className={item} activeProps={active}>
            <User className="h-5 w-5" />
            Profil
          </Link>
        </div>
      </nav>

      {pathname !== "/scan" && (
        <Link
          to="/scan"
          aria-label="Ajouter une canette"
          title="Ajouter une canette"
          className="fixed bottom-24 right-5 z-50 flex items-center gap-2.5 rounded-full bg-primary py-2 pl-2.5 pr-4 text-primary-foreground shadow-glow transition-transform hover:scale-105 active:scale-90"
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
