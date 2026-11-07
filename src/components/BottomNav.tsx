import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, House, MessageCircle, ScanLine, UserRound } from "lucide-react";

const mobileItem = "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold text-muted-foreground transition-colors";
const desktopItem = "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
const active = { className: "!text-foreground font-extrabold [&_svg]:stroke-[2.7]" };

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const items = [
    { to: "/collection" as const, label: "Mon mur", icon: House },
    { to: "/brands" as const, label: "Catalogue", icon: BookOpen },
    { to: "/community" as const, label: "Communauté", icon: MessageCircle },
    { to: "/profile" as const, label: "Moi", icon: UserRound },
  ];

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ececf0] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_18px_rgba(20,20,30,.04)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-end px-1">
          {items.slice(0, 2).map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={mobileItem} activeProps={active}>
              <Icon className="h-[21px] w-[21px]" />
              <span>{label}</span>
            </Link>
          ))}
          <Link to="/scan" aria-label="Scanner une canette" className="relative -mt-5 flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-bold text-white">
            <span className="grid h-12 w-12 place-items-center rounded-full border-[4px] border-white bg-black shadow-md transition-transform active:scale-95"><ScanLine className="h-5 w-5" /></span>
            <span className="text-foreground">Ajouter</span>
          </Link>
          {items.slice(2).map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={mobileItem} activeProps={active}>
              <Icon className="h-[21px] w-[21px]" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#ececf0] bg-white px-5 py-7 md:flex">
        <Link to="/collection" className="mb-10 flex items-center gap-3 px-2">
          <img src="/cansdex-logo.svg" alt="Cansdex" className="h-12 w-auto max-w-[190px] object-contain object-left" />
        </Link>
        <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">Explorer</p>
        <nav className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={desktopItem} activeProps={active}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
        </nav>
        <Link to="/scan" className="mt-auto flex items-center justify-center gap-2 rounded-full bg-black px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#292929] active:scale-[.98]">
          <ScanLine className="h-5 w-5" /> Ajouter une canette
        </Link>
      </aside>
    </>
  );
}
