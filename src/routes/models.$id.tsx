import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { EDITION_LABELS, useCatalog, useOwned } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { ProgressBar } from "@/components/ProgressBar";

export const Route = createFileRoute("/models/$id")({
  head: () => ({
    meta: [
      { title: "Modèle de canette et ses designs — Cansdex" },
      { name: "description", content: "Toutes les variantes de design d’un modèle de canette : éditions, formats, régions et années." },
      { property: "og:title", content: "Modèle de canette et ses designs — Cansdex" },
      { property: "og:description", content: "Toutes les variantes de design d’un modèle de canette à collectionner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModelPage,
});

function ModelPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useCatalog();
  const { data: owned } = useOwned();
  if (isLoading || !data) return <p className="py-12 text-center text-sm text-muted-foreground">Chargement…</p>;
  const model = data.models.find((m) => m.id === id);
  if (!model) return <p>Modèle introuvable.</p>;
  const brand = data.brands.find((b) => b.id === model.brand_id);
  const variants = data.cans.filter((c) => c.model_id === model.id);
  const n = variants.filter((c) => owned?.has(c.id)).length;

  return (
    <div>
      <Link to="/brands/$slug" params={{ slug: brand?.slug ?? "" }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />{brand?.name}
      </Link>
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Modèle</p>
      <h1 className="text-3xl font-black">{model.name}</h1>
      {model.flavour && <p className="mt-1 text-sm text-muted-foreground">{model.flavour}</p>}
      {model.description?.trim() && <p className="mt-3 text-sm leading-relaxed">{model.description}</p>}
      <div className="mt-4 rounded-2xl border bg-card p-4">
        <ProgressBar label="Designs collectionnés" value={n} total={variants.length} color={brand?.color ?? "#888888"} />
      </div>
      <h2 className="mt-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">Variantes de design</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {variants.map((c) => {
          const has = owned?.has(c.id);
          const facts = [c.volume_ml ? `${c.volume_ml} ml` : null, c.region, c.release_year, c.tab_color ? `Languette ${c.tab_color}` : null].filter(Boolean);
          return (
            <Link key={c.id} to="/cans/$id" params={{ id: c.id }} className="group rounded-2xl border bg-card p-3 text-center transition-transform active:scale-95">
              <CanArt can={c} brandName={brand?.name} missing={!has} className="max-w-[72px] group-hover:-translate-y-1" />
              <p className={`mt-2 text-xs font-bold ${has ? "" : "text-muted-foreground"}`}>{c.variant_name}</p>
              <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{EDITION_LABELS[c.edition_type] ?? c.edition_type}</span>
              {facts.length > 0 && <p className="mt-1 text-[10px] text-muted-foreground">{facts.join(" · ")}</p>}
              {has && <span className="mt-1 block text-[10px] font-bold uppercase text-success">Possédé</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
