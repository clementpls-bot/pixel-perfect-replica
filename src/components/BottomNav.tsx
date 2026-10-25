import { Link } from "@tanstack/react-router";
import { Home, Library, ScanBarcode, Layers, User } from "lucide-react";

const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted-foreground transition-colors";
const active = { className: "text-primary" };

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-end">
        <Link to="/" className={item} activeProps={active} activeOptions={{ exact: true }}><Home className="h-5 w-5" />Home</Link>
        <Link to="/brands" className={item} activeProps={active}><Layers className="h-5 w-5" />Brands</Link>
        <Link to="/scan" className="-mt-6 flex flex-1 justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow transition-transform active:scale-90">
            <ScanBarcode className="h-7 w-7" />
          </span>
        </Link>
        <Link to="/collection" className={item} activeProps={active}><Library className="h-5 w-5" />Binder</Link>
        <Link to="/profile" className={item} activeProps={active}><User className="h-5 w-5" />Profile</Link>
      </div>
    </nav>
  );
}
