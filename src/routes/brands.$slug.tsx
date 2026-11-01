import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { ProgressBar } from "@/components/ProgressBar";
import { CanSearch, matchesSearch } from "@/components/CanSearch";
import { PageHeading } from "@/components/PageHeading";

export const Route = createFileRoute("/brands/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Collection ${params.slug} — Cansdex` },
      { name: "description", content: `Toutes les canettes ${params.slug} : découvrez celles que vous possédez et celles qu’il vous manque.` },
      { property: "og:title", content: `Collection ${params.slug} — Cansdex` },
      { property: "og:description", content: `Toutes les canettes ${params.slug} : celles que vous possédez et celles qu’il vous reste à trouver.` },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
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
      <PageHeading title={brand.name} eyebrow="Les designs" action={brand.logo_url ? <img src={brand.logo_url} alt={"Logo " + brand.name} className="brand-medallion h-14 w-14 rounded-full border-2 border-foreground bg-card p-2 object-contain" loading="lazy" /> : undefined} />
      <div className="mt-4 border-y-2 border-foreground bg-secondary px-1 py-4">
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
              <Link key={can.id} to="/cans/$id" params={{ id: can.id }} className="collectible-card group rounded-lg border-2 border-foreground bg-card p-3 text-center transition-transform hover:-translate-y-1 active:scale-[0.98]">
                <CanArt can={can} brandName={brand.name} missing={!has} className="max-w-[82px] group-hover:-translate-y-1" />
                <p className={`mt-2 line-clamp-3 text-xs font-bold leading-tight ${has ? "" : "text-muted-foreground"}`}>{can.name}</p>
                {facts.length > 0 && <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{facts.join(" · ")}</p>}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                  {has && <span className="inline-block rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">Possédée</span>}
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary" title="Nombre de collectionneurs qui ont ajouté cette canette à leur mur">👥 {can.popularity_count ?? 0}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
