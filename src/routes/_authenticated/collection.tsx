import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Store, Wine } from "lucide-react";
import { useCatalog, useOwned } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CanArt } from "@/components/CanArt";
import { CanPlaceholder } from "@/components/CanPlaceholder";
import { Button } from "@/components/ui/button";
import { CanSearch, matchesSearch } from "@/components/CanSearch";

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
  const { user } = useAuth();
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  const { data: drinkRows = [] } = useQuery({
    queryKey: ["collection-drinks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_can_drinks")
        .select("can_id,drinks_count")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });
  const drinksByCan = useMemo(() => new Map(drinkRows.map((row) => [row.can_id, row.drinks_count ?? 0])), [drinkRows]);
  const [search, setSearch] = useState("");
  const allMine = useMemo(() => (data?.cans ?? [])
    .filter((can) => owned?.has(can.id))
    .sort((a, b) => (drinksByCan.get(b.id) ?? 0) - (drinksByCan.get(a.id) ?? 0)
      || a.name.localeCompare(b.name, "fr")),
    [data?.cans, owned, drinksByCan]);
  const mine = useMemo(() => allMine.filter((can) => {
    const brand = data?.brands.find((item) => item.id === can.brand_id);
    return matchesSearch(search, [
      can.name, brand?.name, can.barcode, can.flavour, can.variant_name, can.region,
      can.release_year, can.volume_ml ? `${can.volume_ml} ml` : null,
    ]);
  }), [allMine, data?.brands, search]);

  if (!data || !owned) return <p className="py-12 text-center text-sm text-muted-foreground">Chargement de ton mur…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Ta collection personnelle</p>
          <h1 className="text-[2rem] font-black leading-none tracking-[-.055em] text-black sm:text-4xl">MON MUR</h1>
          <p className="mt-2 text-sm text-muted-foreground">{allMine.length} {allMine.length === 1 ? "canette" : "canettes"} collectionnée{allMine.length > 1 ? "s" : ""}</p>
        </div>
        <Link to="/brands" aria-label="Catalogue" title="Catalogue" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#e8e8ec] bg-white text-black transition hover:bg-[#f6f6f8]">
          <Store className="h-5 w-5" />
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="bubble-surface energy-glow relative flex min-h-[96px] items-center justify-between overflow-hidden rounded-[22px] bg-gradient-to-br from-[#c7ff38] via-[#a7ef36] to-[#53d6b2] p-4 text-[#171923]" style={{ "--bubble-color": "#c7ff38" } as React.CSSProperties}>
          <div><p className="text-3xl font-black leading-none tabular-nums">{allMine.length}</p><p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-black/65">Canettes</p></div>
          <CanPlaceholder className="h-12 w-9 text-black/70" />
        </div>
        <div className="bubble-surface energy-glow relative flex min-h-[96px] items-center justify-between overflow-hidden rounded-[22px] bg-gradient-to-br from-[#6256f5] via-[#9a55ed] to-[#ed5a9c] p-4 text-white" style={{ "--bubble-color": "#a66af0" } as React.CSSProperties}>
          <div><p className="text-3xl font-black leading-none tabular-nums">{data.brands.filter((brand) => data.cans.some((can) => can.brand_id === brand.id && owned.has(can.id))).length}</p><p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-white/75">Marques représentées</p></div>
          <span className="text-4xl drop-shadow-md" aria-hidden="true">✦</span>
        </div>
      </div>

      <div className="relative">
        <CanSearch value={search} onChange={setSearch} placeholder="Rechercher une canette…" ariaLabel="Rechercher une canette sur mon mur" />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 rounded-xl bg-[#24262b] px-4 py-2.5 text-xs font-bold text-white">Sur mon mur</span>
        <Link to="/brands" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-bold text-white">Découvrir le catalogue <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      {search.trim() && <p className="text-xs text-muted-foreground">{mine.length} résultat{mine.length > 1 ? "s" : ""}</p>}

      {allMine.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-[#d9d9df] bg-white px-6 py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#C7FF00] text-[#171923]"><CanPlaceholder className="h-10 w-7" /></div>
          <h2 className="mt-4 text-xl font-black tracking-tight">Ton mur est encore vide</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Scanne une canette pour l’ajouter à ta collection, ou parcours le catalogue pour trouver ta prochaine pièce.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/scan"><Button className="h-12 rounded-full bg-black px-6 font-bold text-white hover:bg-black/85">Scanner une canette</Button></Link>
            <Link to="/brands"><Button variant="outline" className="h-12 rounded-full px-6 font-bold">Explorer le catalogue</Button></Link>
          </div>
        </div>
      ) : mine.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune canette de ton mur ne correspond à « {search} ».</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {mine.map((c) => {
            const brand = data.brands.find((b) => b.id === c.brand_id);
            const color = /^#[0-9a-fA-F]{6}$/.test(brand?.color ?? "") ? brand!.color : "#dfe9f7";
            return (
              <Link key={c.id} to="/cans/$id" params={{ id: c.id }} search={{ from: "/collection" }} className="energy-card group min-w-0 overflow-hidden rounded-[24px] bg-white p-2.5">
                <div className="can-bubble-backdrop relative flex h-40 items-center justify-center overflow-hidden rounded-[18px] p-3 sm:h-48" style={{ "--brand-color": color } as React.CSSProperties}>
<span className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/90 px-2.5 py-1.5 text-[10px] font-bold leading-none tabular-nums text-[#303238] shadow-[0_2px_8px_rgba(20,20,30,.08)] backdrop-blur-sm" title={`${drinksByCan.get(c.id) ?? 0} Drinks`}>
                    <Wine className="h-3 w-3 text-[#777b84]" />{(drinksByCan.get(c.id) ?? 0).toLocaleString("fr-FR")}
                  </span>
                  {brand?.logo_url && <img src={brand.logo_url} alt={brand.name} className="absolute bottom-2 left-2 z-20 h-5 max-w-14 object-contain opacity-90" />}
                  <CanArt can={c} brandName={brand?.name} className="relative z-10 max-h-36 max-w-[76px] transition-transform duration-300 group-hover:scale-105 sm:max-h-44" />
                </div>
                <div className="px-1 pb-1 pt-3">
                  <p className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{brand?.name ?? "Marque"}</p>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-black">{c.name}</p>
                  {c.variant_name !== "Standard" && <p className="mt-1 truncate text-[11px] text-muted-foreground">{c.variant_name}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
