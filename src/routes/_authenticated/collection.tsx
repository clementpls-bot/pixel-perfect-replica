import { createFileRoute, Link } from "@tanstack/react-router";
import { useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/collection")({
  head: () => ({
    meta: [
      { title: "My binder — Cansdex" },
      { name: "description", content: "Your personal can collection as collectible cards." },
      { property: "og:title", content: "My binder — Cansdex" },
      { property: "og:description", content: "Your personal can collection as collectible cards." },
    ],
  }),
  component: Collection,
});

function Collection() {
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  if (!data || !owned) return null;
  const mine = data.cans.filter((c) => owned.has(c.id));
  const brandName = (id: string) => data.brands.find((b) => b.id === id)?.name ?? "";

  return (
    <div>
      <h1 className="text-2xl font-black">My binder</h1>
      <div className="mt-4 rounded-2xl border bg-card p-4">
        <ProgressBar label="Global collection" value={mine.length} total={data.cans.length} />
      </div>
      {mine.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">Your binder is empty.</p>
          <Link to="/scan"><Button className="mt-4 rounded-xl font-bold">Scan your first can</Button></Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {mine.map((c, i) => (
            <Link key={c.id} to="/cans/$id" params={{ id: c.id }}
              className="group relative rounded-3xl p-[2px] transition-transform duration-300 hover:-translate-y-1 hover:rotate-[-1deg] active:scale-95 animate-pop-in"
              style={{ background: `linear-gradient(140deg, ${c.color_primary}, ${c.color_secondary})`, animationDelay: `${i * 40}ms` }}>
              <div className="relative h-full rounded-[calc(1.5rem-2px)] bg-card p-4">
                <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-xs font-black text-primary-foreground tabular-nums">×{owned.get(c.id)}</span>
                <div className="py-2"><CanArt can={c} brandName={brandName(c.brand_id)} className="max-w-[70px] transition-transform duration-500 group-hover:scale-110" /></div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{brandName(c.brand_id)}</p>
                <p className="line-clamp-2 text-sm font-bold leading-tight">{c.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
