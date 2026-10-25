import { createFileRoute, Link } from "@tanstack/react-router";
import { useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { pct } from "@/lib/achievements";

export const Route = createFileRoute("/brands/")({
  head: () => ({
    meta: [
      { title: "Brands — Cansdex" },
      { name: "description", content: "Browse Monster, Red Bull, Coca-Cola, Pepsi and more can collections." },
      { property: "og:title", content: "Brands — Cansdex" },
      { property: "og:description", content: "Browse Monster, Red Bull, Coca-Cola, Pepsi and more can collections." },
    ],
  }),
  component: Brands,
});

function Brands() {
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  return (
    <div>
      <h1 className="mb-5 text-2xl font-black">Brands</h1>
      <div className="grid grid-cols-2 gap-3">
        {data?.brands.map((b) => {
          const list = data.cans.filter((c) => c.brand_id === b.id);
          const n = list.filter((c) => owned?.has(c.id)).length;
          return (
            <Link key={b.id} to="/brands/$slug" params={{ slug: b.slug }}
              className="relative overflow-hidden rounded-3xl border bg-card p-4 transition-transform active:scale-95"
              style={{ boxShadow: `inset 0 -60px 60px -40px ${b.color}55` }}>
              <div className="flex h-24 items-end justify-center gap-1">
                {list.slice(0, 3).map((c) => <div key={c.id} className="w-8"><CanArt can={c} missing={!owned?.has(c.id)} /></div>)}
              </div>
              <p className="mt-3 font-display font-bold">{b.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{n} / {list.length} · {pct(n, list.length)}%</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
