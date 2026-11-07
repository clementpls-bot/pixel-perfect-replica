/**
 * Brand identity colours used when the catalogue has no usable brand colour.
 * These are accents, not full-page backgrounds: the interface stays black/white.
 */
const BRAND_COLORS: Record<string, string> = {
  ghost: "#D7FF3F",
  ghostenergy: "#D7FF3F",
  c4: "#F5C400",
  c4energy: "#F5C400",
  monster: "#00A84F",
  redbull: "#1646A0",
  cocacola: "#E32636",
  pepsi: "#1756A9",
  fanta: "#F47A20",
  sprite: "#35A853",
  rockstar: "#D6A928",
  burn: "#E64A24",
  prime: "#3D70D6",
  celsius: "#B7C6D0",
  bang: "#7C3AED",
  reign: "#8CC63F",
  gatorade: "#F36F21",
  hell: "#D51F35",
  redbullorganics: "#5A8B59",
  nos: "#F0A51B",
  reignstorm: "#8CC63F",
  ripit: "#D84A35",
  cult: "#D52B3F",
  booster: "#E2A52B",
};

function normalizeBrandName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isUsableBrandColor(value?: string | null): value is string {
  return !!value && /^#[0-9a-f]{6}$/i.test(value.trim()) && !["#000000", "#ffffff", "#64748b", "#808080"].includes(value.trim().toLowerCase());
}

/** Stable fallback colour so every brand gets its own identity, even without a DB colour. */
function generatedBrandColor(name: string): string {
  const palette = ["#20A4A8", "#8B5CF6", "#D97736", "#C44569", "#3977B8", "#78952B", "#B45A9B", "#A66A36", "#477D72", "#6574C4", "#C05A42", "#6C8FAD"];
  const key = normalizeBrandName(name);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

/** Resolve a distinctive accent for a brand without forcing colour onto the whole interface. */
export function getBrandColor(name?: string | null, storedColor?: string | null): string {
  const key = normalizeBrandName(name ?? "");
  const mapped = BRAND_COLORS[key] ?? Object.entries(BRAND_COLORS).find(([brandKey]) => key.includes(brandKey) || brandKey.includes(key))?.[1];
  if (mapped) return mapped;
  if (isUsableBrandColor(storedColor)) return storedColor.trim();
  return generatedBrandColor(name || "Cansdex");
}

/** Blend a can's main colour with white for a soft comment background. */
export function pastelCanColor(color?: string | null): string {
  const match = color?.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return "hsl(var(--card))";
  const hex = match[1] ?? "";
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return "#" + channels.map((channel) => Math.round(channel * 0.18 + 255 * 0.82).toString(16).padStart(2, "0")).join("");
}
