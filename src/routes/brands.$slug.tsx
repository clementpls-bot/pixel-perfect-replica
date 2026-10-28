import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { ProgressBar } from "@/components/ProgressBar";

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
  const brand = data?.brands.find((b) => b.slug === slug);
  if (!data) return null;
  if (!brand) return <p>Marque introuvable.</p>;
  const list = data.cans.filter((c) => c.brand_id === brand.id);
  const n = list.filter((c) => owned?.has(c.id)).length;
  const models = data.models.filter((m) => m.brand_id === brand.id)
    .map((m) => ({ model: m, variants: list.filter((c) => c.model_id === m.id) }))
    .filter((x) => x.variants.length > 0);

  return (
    <div>
      <Link to="/brands" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Marques</Link>
      <div className="flex items-center gap-3">
        {brand.logo_url && <img src={brand.logo_url} alt={"Logo " + brand.name} className="h-12 w-12 rounded-xl border bg-white p-1 object-contain" loading="lazy" />}
        <h1 className="text-3xl font-black" style={{ color: brand.color }}>{brand.name}</h1>
      </div>
      <div className="mt-4 rounded-2xl border bg-card p-4">
        <ProgressBar label="Variantes collectionnées" value={n} total={list.length} color={brand.color} />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">{models.length} modèles</p>
      <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {models.map(({ model, variants }) => {
          const ownedCount = variants.filter((c) => owned?.has(c.id)).length;
          const cover = variants.find((c) => owned?.has(c.id)) ?? variants[0]!;
          return (
            <Link key={model.id} to="/models/$id" params={{ id: model.id }} className="group rounded-2xl border bg-card p-3 text-center transition-transform active:scale-95">
              <CanArt can={cover} brandName={brand.name} missing={ownedCount === 0} className="max-w-[64px] group-hover:-translate-y-1" />
              <p className={`mt-2 line-clamp-2 text-[11px] font-semibold leading-tight ${ownedCount ? "" : "text-muted-foreground"}`}>{model.name}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${ownedCount ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {ownedCount}/{variants.length} {variants.length > 1 ? "variantes" : "variante"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
