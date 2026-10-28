import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCatalog } from "@/lib/data";

export const Route = createFileRoute("/models/$id")({
  head: () => ({
    meta: [
      { title: "Collection de canettes — Cansdex" },
      { name: "description", content: "Chaque canette possède son propre design et sa propre fiche." },
    ],
  }),
  component: ModelPage,
});

function ModelPage() {
  const { id } = Route.useParams();
  const { data } = useCatalog();
  const model = data?.models.find((item) => item.id === id);
  const brand = data?.brands.find((item) => item.id === model?.brand_id);

  return (
    <div className="rounded-3xl border bg-card p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Collection</p>
      <h1 className="mt-2 text-2xl font-black">Chaque design est unique</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Les canettes ne sont plus regroupées par modèle ou par variante. Retrouve chaque design comme une pièce de collection indépendante.
      </p>
      <Link to="/brands/$slug" params={{ slug: brand?.slug ?? "" }} className="mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold">
        <ArrowLeft className="h-4 w-4" />Retour aux canettes{brand ? ` de ${brand.name}` : ""}
      </Link>
    </div>
  );
}
