import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { useAdjustCanQuantity, useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
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
  const adjustQuantity = useAdjustCanQuantity();
  const [busyCan, setBusyCan] = useState<string | null>(null);
  if (!data || !owned) return null;

  const mine = data.cans
    .filter((can) => owned.has(can.id))
    .sort((a, b) => {
      const quantityDifference = (owned.get(b.id) ?? 0) - (owned.get(a.id) ?? 0);
      if (quantityDifference !== 0) return quantityDifference;
      const brandDifference = (data.brands.find((brand) => brand.id === a.brand_id)?.name ?? "")
        .localeCompare(data.brands.find((brand) => brand.id === b.brand_id)?.name ?? "");
      return brandDifference || a.name.localeCompare(b.name);
    });
  const brandName = (id: string) => data.brands.find((b) => b.id === id)?.name ?? "";

  const changeQuantity = async (canId: string, delta: 1 | -1) => {
    if (busyCan) return;
    setBusyCan(canId);
    try {
      await adjustQuantity(canId, delta);
      if (delta === -1 && (owned.get(canId) ?? 0) === 1) {
        toast.success("Can removed from your binder.");
      }
    } catch (error) {
      toast.error((error as Error).message || "Unable to update quantity.");
    } finally {
      setBusyCan(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black">My binder</h1>
      <p className="mt-1 text-sm text-muted-foreground">Scan a can once to unlock it. Then use + and − to manage how many you own.</p>
      {mine.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">Your binder is empty.</p>
          <Link to="/scan"><Button className="mt-4 rounded-xl font-bold">Scan your first can</Button></Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {mine.map((c, i) => {
            const quantity = owned.get(c.id) ?? 0;
            return (
              <article key={c.id}
                className="group relative rounded-3xl p-[2px] transition-transform duration-300 hover:-translate-y-1 animate-pop-in"
                style={{ background: `linear-gradient(140deg, ${c.color_primary}, ${c.color_secondary})`, animationDelay: `${i * 40}ms` }}>
                <div className="relative h-full rounded-[calc(1.5rem-2px)] bg-card p-3 sm:p-4">
                  <Link to="/cans/$id" params={{ id: c.id }} className="block">
                    <div className="py-2"><CanArt can={c} brandName={brandName(c.brand_id)} className="max-w-[70px] transition-transform duration-500 group-hover:scale-110" /></div>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{brandName(c.brand_id)}</p>
                    <p className="line-clamp-2 min-h-9 text-sm font-bold leading-tight">{c.name}</p>
                  </Link>
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-muted/60 p-1.5">
                    <Button type="button" variant="secondary" size="icon" className="h-9 w-9 shrink-0 rounded-lg"
                      aria-label={`Remove one ${c.name}`} disabled={busyCan !== null}
                      onClick={() => void changeQuantity(c.id, -1)}><Minus className="h-4 w-4" /></Button>
                    <span className="min-w-0 text-center text-xs font-black tabular-nums">×{quantity}</span>
                    <Button type="button" variant="secondary" size="icon" className="h-9 w-9 shrink-0 rounded-lg"
                      aria-label={`Add one ${c.name}`} disabled={busyCan !== null}
                      onClick={() => void changeQuantity(c.id, 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
