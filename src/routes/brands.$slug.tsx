import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const brand = data?.brands.find((b) => b.slug === slug);

  const allCans = useMemo(() => (data?.cans ?? [])
    .filter((can) => can.brand_id === brand?.id)
    .sort((a, b) => a.name.localeCompare(b.name, "fr")), [data?.cans, brand?.id]);
  const cans = useMemo(() => allCans.filter((can) => matchesSearch(search, [
    can.name, brand?.name, can.barcode, can.flavour, can.variant_name, can.region,
    can.release_year, can.volume_ml ? `${can.volume_ml} ml` : null,
  ])), [allCans, search, brand?.name]);
  const ownedCount = allCans.filter((can) => owned?.has(can.id)).length;

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
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Les designs</p>
        <p className="text-xs text-muted-foreground">{ownedCount}/{allCans.length} canettes possédées</p>
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
              <Link key={can.id} to="/cans/$id" params={{ id: can.id }} className="group rounded-2xl border bg-card p-3 text-center transition-transform active:scale-[0.98]">
                <CanArt can={can} brandName={brand.name} missing={!has} className="max-w-[68px] group-hover:-translate-y-1" />
                <p className={`mt-2 line-clamp-3 text-xs font-bold leading-tight ${has ? "" : "text-muted-foreground"}`}>{can.name}</p>
                {facts.length > 0 && <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{facts.join(" · ")}</p>}
                {has && <span className="mt-2 inline-block rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">Possédée</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
