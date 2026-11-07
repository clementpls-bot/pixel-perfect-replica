import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Store } from "lucide-react";
import { useCatalog, useOwned } from "@/lib/data";
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
        <div className="flex min-h-[88px] items-center justify-between overflow-hidden rounded-[22px] bg-[#fff4bd] p-4">
          <div><p className="text-2xl font-black leading-none tabular-nums">{allMine.length}</p><p className="mt-1 text-xs font-semibold text-black/60">Canettes</p></div>
          <CanPlaceholder className="h-12 w-9 text-black/65" />
        </div>
        <div className="flex min-h-[88px] items-center justify-between overflow-hidden rounded-[22px] bg-[#e5f2ff] p-4">
          <div><p className="text-2xl font-black leading-none tabular-nums">{data.brands.filter((brand) => data.cans.some((can) => can.brand_id === brand.id && owned.has(can.id))).length}</p><p className="mt-1 text-xs font-semibold text-black/60">Marques représentées</p></div>
          <span className="text-4xl" aria-hidden="true">🏆</span>
        </div>
      </div>

      <div className="relative">
        <CanSearch value={search} onChange={setSearch} placeholder="Rechercher une canette…" ariaLabel="Rechercher une canette sur mon mur" />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 rounded-xl bg-[#24262b] px-4 py-2.5 text-xs font-bold text-white">Sur mon mur</span>
        <Link to="/brands" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#f3f4f6] px-4 py-2.5 text-xs font-bold text-black">Découvrir le catalogue <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      {search.trim() && <p className="text-xs text-muted-foreground">{mine.length} résultat{mine.length > 1 ? "s" : ""}</p>}

      {allMine.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-[#d9d9df] bg-white px-6 py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#fff4bd] text-black"><CanPlaceholder className="h-10 w-7" /></div>
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
              <Link key={c.id} to="/cans/$id" params={{ id: c.id }} className="group min-w-0 overflow-hidden rounded-[24px] border border-[#ededf0] bg-white p-2.5 shadow-[0_2px_12px_rgba(20,20,30,.035)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(20,20,30,.09)]">
                <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-[18px] p-3 sm:h-48" style={{ background: `linear-gradient(145deg, ${color}25, #f7f8fa 78%)` }}>
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold text-black shadow-sm">✓ Dans mon mur</span>
                  {brand?.logo_url && <img src={brand.logo_url} alt={brand.name} className="absolute bottom-2 left-2 h-5 max-w-14 object-contain opacity-80" />}
                  <CanArt can={c} brandName={brand?.name} className="max-h-36 max-w-[76px] transition-transform duration-300 group-hover:scale-105 sm:max-h-44" />
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
