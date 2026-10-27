import { createFileRoute, Link } from "@tanstack/react-router";
import { useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { pct } from "@/lib/achievements";

export const Route = createFileRoute("/brands/")({
  head: () => ({
    meta: [
      { title: "Marques — Cansdex" },
      { name: "description", content: "Parcourez les marques de boissons et complétez votre collection de canettes." },
      { property: "og:title", content: "Marques — Cansdex" },
      { property: "og:description", content: "Parcourez les marques de boissons et complétez votre collection de canettes." },
    ],
  }),
  component: Brands,
});

function Brands() {
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  return (
    <div>
      <h1 className="mb-5 text-2xl font-black">Catalogue des marques</h1>
      <div className="grid grid-cols-2 gap-3">
        {data?.brands.map((b) => {
          const list = data.cans.filter((c) => c.brand_id === b.id);
          const n = list.filter((c) => owned?.has(c.id)).length;
          return (
            <Link key={b.id} to="/brands/$slug" params={{ slug: b.slug }}
              className="relative overflow-hidden rounded-3xl border bg-card p-4 transition-transform active:scale-95"
              style={{ boxShadow: `inset 0 -60px 60px -40px ${b.color}55` }}>
              <div className="flex h-24 items-center justify-center gap-1">
                {b.logo_url ? (
                  <img src={b.logo_url} alt={`Logo ${b.name}`} loading="lazy" className="max-h-14 max-w-[120px] object-contain" />
                ) : list.length ? (
                  <div className="flex h-full items-end justify-center gap-1">
                    {list.slice(0, 3).map((c) => <div key={c.id} className="w-8"><CanArt can={c} missing={!owned?.has(c.id)} /></div>)}
                  </div>
                ) : (
                  <span className="text-2xl font-black" style={{ color: b.color }}>{b.name}</span>
                )}
              </div>
              {list.length > 0 && (
                <div className="mt-1 flex h-12 items-end justify-center gap-1">
                  {list.slice(0, 3).map((c) => <div key={c.id} className="w-6"><CanArt can={c} missing={!owned?.has(c.id)} /></div>)}
                </div>
              )}
              <p className="mt-3 font-display font-bold">{b.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {n} / {list.length} canettes · {pct(n, list.length)} %
              </p>
              {list.length === 0 && <p className="mt-1 text-[11px] text-muted-foreground">Catalogue à compléter</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
