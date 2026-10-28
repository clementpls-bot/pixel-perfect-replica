import { createFileRoute, Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/collection")({
  head: () => ({
    meta: [
      { title: "Mon mur — Cansdex" },
      { name: "description", content: "Votre mur personnel de canettes." },
      { property: "og:title", content: "Mon mur — Cansdex" },
      { property: "og:description", content: "Votre mur personnel de canettes." },
    ],
  }),
  component: Collection,
});

function Collection() {
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  if (!data || !owned) return <p className="py-12 text-center text-sm text-muted-foreground">Chargement de ton mur…</p>;

  const mine = data.cans
    .filter((can) => owned.has(can.id))
    .sort((a, b) => {
      const bd = (data.brands.find((x) => x.id === a.brand_id)?.name ?? "")
        .localeCompare(data.brands.find((x) => x.id === b.brand_id)?.name ?? "");
      return bd || a.name.localeCompare(b.name);
    });


  return (
    <div className="collection-page">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Mon mur</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mine.length} {mine.length === 1 ? "design" : "designs"} sur ton mur
          </p>
        </div>
        <Link
          to="/brands"
          aria-label="Magasin"
          title="Magasin"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent active:scale-95"
        >
          <Store className="h-5 w-5" />
          <span>Magasin</span>
        </Link>
      </header>

      {mine.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed bg-card/50 px-6 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Ton mur est encore vide</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Scanne une canette pour l’ajouter à ton mur, ou parcours le catalogue pour en découvrir.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link to="/brands">
              <Button className="h-11 w-full rounded-xl font-bold">Explorer le catalogue</Button>
            </Link>
            <Link to="/scan">
              <Button variant="secondary" className="h-11 w-full rounded-xl font-semibold">Scanner une canette</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-3 collection-grid">
          {mine.map((c, i) => {
            const brand = data.brands.find((b) => b.id === c.brand_id);
            return (
              <Link key={c.id} to="/cans/$id" params={{ id: c.id }}
                className="group relative block overflow-hidden rounded-2xl border bg-card p-2 text-center shadow-sm transition-transform duration-300 hover:-translate-y-1 active:scale-95 animate-pop-in"
                style={{ background: `radial-gradient(circle at 50% 40%, ${c.color_primary}33, transparent 70%)`, animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between gap-1">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border bg-background shadow-sm">
                    {brand?.logo_url
                      ? <img src={brand.logo_url} alt={`Logo ${brand.name}`} className="h-6 w-6 object-contain" />
                      : <span className="text-xs font-black" style={{ color: brand?.color }}>{brand?.name.slice(0, 2).toUpperCase()}</span>}
                  </div>
                </div>
                <div className="py-2">
                  <CanArt can={c} brandName={brand?.name} className="max-w-[64px] transition-transform duration-500 group-hover:scale-105" />
                </div>
                <span className="inline-block rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">Possédé</span>
                <div
                  className="mt-1.5 rounded-lg border-l-[3px] px-1.5 py-1"
                  style={{ background: `${brand?.color ?? "var(--color-muted)"}1f`, borderLeftColor: brand?.color ?? "var(--color-border)" }}
                >
                  <p className="line-clamp-2 min-h-8 text-[11px] font-bold leading-tight">{c.name}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
