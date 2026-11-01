import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Store } from "lucide-react";
import { useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { Button } from "@/components/ui/button";
import { CanSearch, matchesSearch } from "@/components/CanSearch";
import { PageHeading } from "@/components/PageHeading";

export const Route = createFileRoute("/_authenticated/collection")({
  head: () => ({
    meta: [
      { title: "Mon mur — Cansdex" },
      { name: "description", content: "Votre mur personnel de canettes." },
      { property: "og:title", content: "Mon mur — Cansdex" },
      { property: "og:description", content: "Votre mur personnel de canettes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
  }),
  component: Collection,
});

function Collection() {
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  const [search, setSearch] = useState("");
  const allMine = useMemo(() => (data?.cans ?? [])
    .filter((can) => owned?.has(can.id))
    .sort((a, b) => {
      const brandA = data?.brands.find((x) => x.id === a.brand_id)?.name ?? "";
      const brandB = data?.brands.find((x) => x.id === b.brand_id)?.name ?? "";
      return brandA.localeCompare(brandB, "fr") || a.name.localeCompare(b.name, "fr");
    }), [data?.cans, data?.brands, owned]);
  const mine = useMemo(() => allMine.filter((can) => {
    const brand = data?.brands.find((item) => item.id === can.brand_id);
    return matchesSearch(search, [
      can.name, brand?.name, can.barcode, can.flavour, can.variant_name, can.region,
      can.release_year, can.volume_ml ? `${can.volume_ml} ml` : null,
    ]);
  }), [allMine, data?.brands, search]);

  if (!data || !owned) return <p className="py-12 text-center text-sm text-muted-foreground">Chargement de ton mur…</p>;

  return (
    <div>
      <PageHeading title="Mon mur" eyebrow="Pièces de collection" action={<Button asChild variant="outline" className="h-11 rounded-lg px-3"><Link
          to="/brands"
          aria-label="Catalogue"
          title="Catalogue"
        >
          <Store className="h-5 w-5" />
          <span>Catalogue</span>
        </Link></Button>}>
        {allMine.length} {allMine.length === 1 ? "design" : "designs"} sur ton mur
      </PageHeading>

      <CanSearch
        value={search}
        onChange={setSearch}
        placeholder="Rechercher sur ton mur…"
        ariaLabel="Rechercher une canette sur mon mur"
        className="mt-5"
      />
      {search.trim() && <p className="mt-2 text-xs text-muted-foreground">{mine.length} résultat{mine.length > 1 ? "s" : ""}</p>}

      {allMine.length === 0 ? (
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
      ) : mine.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune canette de ton mur ne correspond à « {search} ».
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {mine.map((c, i) => {
            const brand = data.brands.find((b) => b.id === c.brand_id);
            return (
              <Link key={c.id} to="/cans/$id" params={{ id: c.id }}
                className="collectible-card group relative block overflow-hidden rounded-lg border-2 border-foreground bg-card p-2 text-center transition-transform duration-300 hover:-translate-y-1 active:scale-95 animate-pop-in"
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <div className="flex items-start justify-between gap-1">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border bg-background shadow-sm">
                    {brand?.logo_url
                      ? <img src={brand.logo_url} alt={`Logo ${brand.name}`} className="h-6 w-6 object-contain" />
                      : <span className="text-xs font-black text-foreground">{brand?.name.slice(0, 2).toUpperCase()}</span>}
                  </div>
                </div>
                <div className="py-2">
                  <CanArt can={c} brandName={brand?.name} className="max-w-[76px] transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  <span className="inline-block rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">Possédé</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary" title="Nombre de collectionneurs qui ont ajouté cette canette à leur mur">👥 {c.popularity_count ?? 0}</span>
                </div>
                <div
                  className="mt-1.5 rounded border-l-[3px] border-foreground bg-secondary px-1.5 py-1"
                >
                  <p className="line-clamp-2 min-h-8 text-[11px] font-bold leading-tight">{c.name}</p>
                  {c.variant_name !== "Standard" && <p className="truncate text-[10px] text-muted-foreground">{c.variant_name}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
