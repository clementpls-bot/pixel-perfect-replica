import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { ProgressBar } from "@/components/ProgressBar";

export const Route = createFileRoute("/brands/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} collection — Cansdex` },
      { name: "description", content: `Toutes les canettes ${params.slug} : découvrez celles que vous possédez et celles qu’il vous manque.` },
      { property: "og:title", content: `${params.slug} collection — Cansdex` },
      { property: "og:description", content: `Every ${params.slug} can — see which ones you own and which are missing.` },
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

  return (
    <div>
      <Link to="/brands" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Marques</Link>
      <div className="flex items-center gap-3">
        {brand.logo_url && <img src={brand.logo_url} alt={"Logo " + brand.name} className="h-12 w-12 rounded-xl border bg-white p-1 object-contain" loading="lazy" />}
        <h1 className="text-3xl font-black" style={{ color: brand.color }}>{brand.name}</h1>
      </div>
      <div className="mt-4 rounded-2xl border bg-card p-4">
        <ProgressBar label="Canettes collectionnées" value={n} total={list.length} color={brand.color} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {list.map((c) => {
          const has = owned?.has(c.id);
          return (
            <Link key={c.id} to="/cans/$id" params={{ id: c.id }} className="group rounded-2xl border bg-card p-3 text-center transition-transform active:scale-95">
              <CanArt can={c} brandName={brand.name} missing={!has} className="max-w-[64px] group-hover:-translate-y-1" />
              <p className={`mt-2 line-clamp-2 text-[11px] font-semibold leading-tight ${has ? "" : "text-muted-foreground"}`}>{c.name}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
