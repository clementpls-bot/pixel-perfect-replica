import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanBarcode } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCatalog, useOwned } from "@/lib/data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cansdex — Your drink can collection" },
      { name: "description", content: "Scan energy drink and soda cans, track your progress and complete every brand." },
      { property: "og:title", content: "Cansdex — Your drink can collection" },
      { property: "og:description", content: "Scan energy drink and soda cans, track your progress and complete every brand." },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  const ownedSet = owned ?? new Map<string, number>();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black">CANS<span className="text-primary">DEX</span></h1>
        {!user && <Link to="/auth"><Button size="sm" variant="secondary" className="rounded-full">Sign in</Button></Link>}
      </header>

      <Link to="/scan"><Button className="h-12 w-full rounded-xl font-bold shadow-glow"><ScanBarcode className="mr-1" />Scan a can</Button></Link>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Brands</h2>
          <Link to="/brands" className="text-sm text-primary">See all</Link>
        </div>
        {data?.brands.map((b) => {
          const list = data.cans.filter((c) => c.brand_id === b.id);
          const n = list.filter((c) => ownedSet.has(c.id)).length;
          return (
            <Link key={b.id} to="/brands/$slug" params={{ slug: b.slug }} className="block rounded-2xl border bg-card p-4 transition-transform active:scale-[0.98]">
              <ProgressBar label={b.name} value={n} total={list.length} color={b.color} />
            </Link>
          );
        })}
      </section>
    </div>
  );
}
