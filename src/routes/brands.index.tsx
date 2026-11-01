import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCatalog, useOwned, type Brand } from "@/lib/data";
import { pct } from "@/lib/achievements";
import { CanSearch, matchesSearch, normalizeSearch } from "@/components/CanSearch";
import { PageHeading } from "@/components/PageHeading";

export const Route = createFileRoute("/brands/")({
  head: () => ({
    meta: [
      { title: "Catalogue — Cansdex" },
      { name: "description", content: "Explore les marques, découvre leurs canettes et complète ta collection." },
      { property: "og:title", content: "Catalogue — Cansdex" },
      { property: "og:description", content: "Explore les marques, découvre leurs canettes et complète ta collection." },
    ],
  }),
  component: Brands,
});

// Known, widely recognised drinks brands appear first; other brands stay alphabetic.
const popularBrandOrder = [
  "cocacola",
  "redbull",
  "monster",
  "pepsi",
  "fanta",
  "sprite",
  "rockstar",
  "burn",
  "prime",
  "celsius",
  "hell",
  "gatorade",
];

function normalizeBrandName(value: string) {
  return normalizeSearch(value).replace(/[^a-z0-9]/g, "");
}

function popularityRank(name: string) {
  const normalized = normalizeBrandName(name);
  const rank = popularBrandOrder.findIndex((brand) => normalized.includes(brand));
  return rank === -1 ? popularBrandOrder.length : rank;
}

function Brands() {
  const { data, isLoading, error } = useCatalog();
  const { data: owned } = useOwned();
  const [search, setSearch] = useState("");

  // Avoid duplicate brands, preferring the entry that has a logo.
  const brands = useMemo(() => {
    const byName = new Map<string, Brand>();
    for (const brand of data?.brands ?? []) {
      const key = normalizeBrandName(brand.name);
      const current = byName.get(key);
      if (!current || (!current.logo_url && brand.logo_url)) byName.set(key, brand);
    }
    return [...byName.values()]
      .filter((brand) => matchesSearch(search, [brand.name]))
      .sort((a, b) => popularityRank(a.name) - popularityRank(b.name) || a.name.localeCompare(b.name, "fr"));
  }, [data?.brands, search]);

  if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Chargement du catalogue…</div>;
  if (error) return <div className="rounded-2xl border p-5 text-sm text-muted-foreground">Impossible de charger les marques pour le moment.</div>;

  return (
    <div className="pb-8">
      <PageHeading title="Catalogue" eyebrow="La chasse aux designs" />

      <CanSearch
        value={search}
        onChange={setSearch}
        placeholder="Rechercher une marque…"
        ariaLabel="Rechercher une marque dans le catalogue"
        className="mb-4"
      />
      <p className="mb-4 text-xs text-muted-foreground">{brands.length} marque{brands.length > 1 ? "s" : ""}</p>

      {brands.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune marque ne correspond à « {search} ». Essaie un autre nom.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {brands.map((b) => {
            const list = (data?.cans ?? []).filter((c) => c.brand_id === b.id);
            const n = list.filter((c) => owned?.has(c.id)).length;
            const color = /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : "var(--foreground)";

            return (
              <Link
                key={b.id}
                to="/brands/$slug"
                params={{ slug: b.slug }}
                className="brand-card collectible-card group relative min-w-0 overflow-hidden rounded-lg border-2 border-foreground bg-card p-4 transition duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
              >
                <div className="brand-medallion mx-auto flex h-32 w-32 items-center justify-center rounded-full border-2 border-foreground bg-card p-4 sm:h-36 sm:w-36">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={`Logo ${b.name}`} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <span className="break-words text-center font-display text-2xl text-foreground">{b.name}</span>
                  )}
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black tracking-tight sm:text-xl">{b.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {list.length} {list.length > 1 ? "canettes au catalogue" : "canette au catalogue"}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-lg border-2 border-foreground bg-card px-3 py-2 text-right">
                    <p className="text-sm font-black tabular-nums">{n}<span className="font-medium text-muted-foreground">/{list.length}</span></p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{pct(n, list.length)} %</p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct(n, list.length)}%`, backgroundColor: color }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-foreground">
                  <span>{list.length === 0 ? "Catalogue à compléter" : "Voir la collection"}</span>
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
