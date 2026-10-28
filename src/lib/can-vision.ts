import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const inputSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/").max(3_000_000),
});

type CanCandidate = {
  id: string;
  name: string;
  brand_id: string;
  model_id: string | null;
  variant_name: string;
  edition_type: string;
  volume_ml: number | null;
  region: string | null;
  release_year: number | null;
  image_url: string | null;
  barcode: string;
  brand_name: string;
  model_name: string | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export const recognizeCanImage = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const apiKey = typeof process !== "undefined" ? process.env.OPENAI_API_KEY : undefined;
    if (!apiKey) {
      throw new Error("La reconnaissance IA n’est pas encore configurée : ajoute OPENAI_API_KEY dans les secrets du serveur Lovable.");
    }

    const [brandsResult, modelsResult, cansResult] = await Promise.all([
      supabase.from("brands").select("id,name").order("name"),
      supabase.from("can_models").select("id,brand_id,name,flavour").order("name"),
      supabase.from("cans").select("*").order("name").limit(2500),
    ]);
    if (brandsResult.error) throw new Error("Impossible de charger les marques du catalogue.");
    if (modelsResult.error) throw new Error("Impossible de charger les modèles du catalogue.");
    if (cansResult.error) throw new Error("Impossible de charger les canettes du catalogue.");

    const brands = brandsResult.data ?? [];
    const models = modelsResult.data ?? [];
    const cans = cansResult.data ?? [];
    const brandById = new Map(brands.map((brand) => [brand.id, brand.name]));
    const modelById = new Map(models.map((model) => [model.id, model.name]));
    const compactCatalog = {
      brands: brands.slice(0, 300).map((brand) => brand.name),
      models: models.slice(0, 500).map((model) => ({
        brand: brandById.get(model.brand_id) ?? "",
        name: model.name,
        flavour: model.flavour,
      })),
      variants: cans.slice(0, 350).map((can) => ({
        brand: brandById.get(can.brand_id) ?? "",
        model: can.model_id ? modelById.get(can.model_id) ?? can.name : can.name,
        variant: can.variant_name,
        edition: can.edition_type,
        volume_ml: can.volume_ml,
        region: can.region,
        year: can.release_year,
      })),
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Tu es un expert en identification visuelle de canettes. Analyse l’image sans inventer d’information invisible. Compare-la au catalogue fourni, mais si aucune variante ne correspond réellement, dis-le. Renvoie uniquement un JSON avec ces champs : brand_name (string|null), model_name (string|null), variant_name (string|null), edition_type (string|null), volume_ml (number|null), region (string|null), release_year (number|null), confidence (nombre entre 0 et 1), visual_cues (tableau de chaînes), reasoning (courte chaîne). Une forte confiance signifie que le design exact est reconnaissable, pas seulement la marque. Catalogue actuel : ${JSON.stringify(compactCatalog)}`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identifie cette canette et sa variante de design précise. Signale l’incertitude plutôt que de deviner." },
              { type: "image_url", image_url: { url: data.imageDataUrl, detail: "high" } },
            ],
          },
        ],
      }),
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error("Le service de reconnaissance est temporairement très sollicité. Réessaie dans un instant.");
      throw new Error("La reconnaissance IA a échoué. Réessaie avec une photo plus nette.");
    }
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) throw new Error("L’IA n’a pas renvoyé de résultat exploitable.");
    let vision: {
      brand_name?: string | null; model_name?: string | null; variant_name?: string | null;
      edition_type?: string | null; volume_ml?: number | null; region?: string | null;
      release_year?: number | null; confidence?: number; visual_cues?: string[]; reasoning?: string;
    };
    try { vision = JSON.parse(raw); } catch { throw new Error("Le résultat de l’analyse est illisible. Réessaie avec une autre photo."); }

    const brandNeedle = normalize(vision.brand_name);
    const modelNeedle = normalize(vision.model_name);
    const variantNeedle = normalize(vision.variant_name);
    const sameBrand = cans.filter((can) => normalize(brandById.get(can.brand_id)) === brandNeedle);
    const sameModel = sameBrand.filter((can) => {
      const modelName = normalize(can.model_id ? modelById.get(can.model_id) : can.name);
      return modelNeedle && (modelName === modelNeedle || modelName.includes(modelNeedle) || modelNeedle.includes(modelName));
    });
    const ranked = sameModel.map((can) => {
      let score = 0;
      if (normalize(can.variant_name) === variantNeedle) score += 0.5;
      if (normalize(can.edition_type) === normalize(vision.edition_type)) score += 0.15;
      if (vision.volume_ml != null && can.volume_ml === vision.volume_ml) score += 0.15;
      if (vision.region && normalize(can.region) === normalize(vision.region)) score += 0.1;
      if (vision.release_year != null && can.release_year === vision.release_year) score += 0.1;
      return { can, score };
    }).sort((a, b) => b.score - a.score).slice(0, 3);

    const candidates: CanCandidate[] = ranked.map(({ can }) => ({
      ...can,
      brand_name: brandById.get(can.brand_id) ?? "Marque inconnue",
      model_name: can.model_id ? modelById.get(can.model_id) ?? null : null,
    }));
    const rawConfidence = Number(vision.confidence ?? 0);
    const confidence = Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : 0;
    const best = ranked[0];
    const exactMatch = best && best.score >= 0.65 && confidence >= 0.78;
    return {
      vision: {
        brand_name: vision.brand_name ?? null,
        model_name: vision.model_name ?? null,
        variant_name: vision.variant_name ?? null,
        edition_type: vision.edition_type ?? null,
        volume_ml: vision.volume_ml ?? null,
        region: vision.region ?? null,
        release_year: vision.release_year ?? null,
        confidence,
        visual_cues: Array.isArray(vision.visual_cues) ? vision.visual_cues.slice(0, 8) : [],
        reasoning: vision.reasoning ?? "",
      },
      match_type: exactMatch ? "exact" as const : candidates.length ? "candidates" as const : "unknown" as const,
      candidates,
    };
  });
