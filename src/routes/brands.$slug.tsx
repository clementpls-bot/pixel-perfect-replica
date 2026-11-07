import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Star, Wine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { ProgressBar } from "@/components/ProgressBar";
import { CanSearch, matchesSearch } from "@/components/CanSearch";

export const Route = createFileRoute("/brands/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Collection ${params.slug} — Cansdex` },
      { name: "description", content: `Toutes les canettes ${params.slug} : découvrez celles que vous possédez et celles qu’il vous manque.` },
      { property: "og:title", content: `Collection ${params.slug} — Cansdex` },
      { property: "og:description", content: `Toutes les canettes ${params.slug} : celles que vous possédez et celles qu’il vous reste à trouver.` },
    ],
  }),
  component: BrandPage,
});

function BrandPage() {
  const { slug } = Route.useParams();
  const { data } = useCatalog();
  const { data: owned } = useOwned();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "drinks" | "caffeine" | "rating">("name");
  const brand = data?.brands.find((b) => b.slug === slug);

  const brandStats = useQuery({
    queryKey: ["brand-can-stats", brand?.id],
    enabled: !!brand?.id,
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any).rpc("get_brand_can_stats", { p_brand_id: brand!.id });
      if (error) throw error;
      return (rows ?? []) as { can_id: string; total_drinks: number; average_rating: number | null; rating_count: number }[];
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!brand?.id) return;
    const refresh = () => { void qc.invalidateQueries({ queryKey: ["brand-can-stats", brand.id] }); };
    const channel = supabase.channel(`brand-stats-${brand.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_can_drinks" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ratings" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [brand?.id, qc]);
  const allCans = useMemo(() => (data?.cans ?? [])
    .filter((can) => can.brand_id === brand?.id)
    .sort((a, b) => a.name.localeCompare(b.name, "fr")), [data?.cans, brand?.id]);
  const statsByCan = useMemo(() => new Map((brandStats.data ?? []).map((row) => [row.can_id, row])), [brandStats.data]);
  const cans = useMemo(() => {
    const filtered = allCans.filter((can) => matchesSearch(search, [
      can.name, brand?.name, can.barcode, can.flavour, can.variant_name, can.region,
      can.release_year, can.volume_ml ? `${can.volume_ml} ml` : null,
    ]));
    return filtered.sort((a, b) => {
      if (sortBy === "drinks") return (statsByCan.get(b.id)?.total_drinks ?? 0) - (statsByCan.get(a.id)?.total_drinks ?? 0) || a.name.localeCompare(b.name, "fr");
      if (sortBy === "caffeine") return (b.caffeine_mg_per_100ml ?? -1) - (a.caffeine_mg_per_100ml ?? -1) || a.name.localeCompare(b.name, "fr");
      if (sortBy === "rating") return (statsByCan.get(b.id)?.average_rating ?? -1) - (statsByCan.get(a.id)?.average_rating ?? -1) || a.name.localeCompare(b.name, "fr");
      return a.name.localeCompare(b.name, "fr");
    });
  }, [allCans, search, brand?.name, sortBy, statsByCan]);
  const ownedCount = allCans.filter((can) => owned?.has(can.id)).length;
  const brandDrinks = allCans.reduce((sum, can) => sum + (statsByCan.get(can.id)?.total_drinks ?? 0), 0);
  const ratingPoints = allCans.reduce((sum, can) => {
    const stat = statsByCan.get(can.id);
    return sum + (stat?.average_rating ?? 0) * (stat?.rating_count ?? 0);
  }, 0);
  const brandRatingCount = allCans.reduce((sum, can) => sum + (statsByCan.get(can.id)?.rating_count ?? 0), 0);
  const brandRating = brandRatingCount ? ratingPoints / brandRatingCount : null;

  if (!data) return null;
  if (!brand) return <p>Marque introuvable.</p>;

  return (
    <div>
      <Link to="/brands" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />Catalogue
      </Link>
      <div className="flex items-center gap-3">
        {brand.logo_url && <img src={brand.logo_url} alt={"Logo " + brand.name} className="h-12 w-12 rounded-xl border bg-white p-1 object-contain" loading="lazy" />}
        <h1 className="text-3xl font-black" style={{ color: brand.color }}>{brand.name}</h1>
      </div>
      <div className="mt-4 rounded-2xl border bg-card p-4">
        <ProgressBar label="Canettes collectionnées" value={ownedCount} total={allCans.length} color={brand.color} />
        <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Note de la marque</div>
            <p className="mt-1 text-2xl font-black tabular-nums">{brandRating == null ? "—" : brandRating.toFixed(1)}<span className="ml-1 text-xs font-semibold text-muted-foreground">/ 5</span></p>
            <div className="mt-0.5 flex items-center gap-0.5" aria-label={brandRating == null ? "Aucune note" : `Note moyenne ${brandRating.toFixed(1)} sur 5`}>
              {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-3.5 w-3.5 ${brandRating != null && brandRating >= n - 0.25 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />)}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{brandRatingCount} avis sur les canettes</p>
          </div>
          <div className="min-w-0 border-l pl-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Wine className="h-4 w-4" /> Drinks cumulés</div>
            <p className="mt-1 text-2xl font-black tabular-nums">{brandDrinks.toLocaleString("fr-FR")}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Toute la communauté · toutes les canettes</p>
          </div>
        </div>
        {brandStats.isError && <p className="mt-2 text-[10px] text-muted-foreground">Statistiques temporairement indisponibles.</p>}
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Les designs</p>
        <p className="text-xs text-muted-foreground">{ownedCount}/{allCans.length} canettes possédées</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="brand-can-sort" className="text-xs font-semibold text-muted-foreground">Trier les canettes</label>
        <select id="brand-can-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-9 rounded-xl border bg-card px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring">
          <option value="name">Nom (A à Z)</option>
          <option value="drinks">Plus de Drinks</option>
          <option value="caffeine">Plus de caféine</option>
          <option value="rating">Meilleure note</option>
        </select>
      </div>
      <CanSearch
        value={search}
        onChange={setSearch}
        placeholder={`Rechercher une canette ${brand.name}…`}
        ariaLabel={`Rechercher une canette de ${brand.name}`}
        className="mt-3"
      />
      <p className="mt-2 text-xs text-muted-foreground">{cans.length} canette{cans.length > 1 ? "s" : ""} affichée{cans.length > 1 ? "s" : ""}</p>
      {allCans.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Aucune canette dans cette collection pour le moment.</p>
      ) : cans.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Aucune canette ne correspond à « {search} ».</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {cans.map((can) => {
            const has = owned?.has(can.id) ?? false;
            const facts = [
              can.volume_ml ? `${can.volume_ml} ml` : null,
              can.region,
              can.release_year,
              can.flavour,
            ].filter(Boolean);
            return (
              <Link key={can.id} to="/cans/$id" params={{ id: can.id }} className="group rounded-[22px] border border-[#ededf0] bg-white p-3 text-center shadow-[0_2px_12px_rgba(20,20,30,.035)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(20,20,30,.09)] active:scale-[0.98]">
                <CanArt can={can} brandName={brand.name} missing={!has} className="max-w-[68px] group-hover:-translate-y-1" />
                <p className={`mt-2 line-clamp-3 text-xs font-bold leading-tight ${has ? "" : "text-muted-foreground"}`}>{can.name}</p>
                {facts.length > 0 && <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{facts.join(" · ")}</p>}
                <div className="mt-1.5 flex flex-wrap justify-center gap-x-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5"><Wine className="h-3 w-3" />{(statsByCan.get(can.id)?.total_drinks ?? 0).toLocaleString("fr-FR")}</span>
                  {statsByCan.get(can.id)?.average_rating != null && <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(statsByCan.get(can.id)?.average_rating).toFixed(1)}</span>}
                </div>
                {has && <span className="mt-2 inline-block rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">Possédée</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
