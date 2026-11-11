/**
 * Brand identity colours used when the catalogue has no usable brand colour.
 * These are accents, not full-page backgrounds: the interface stays black/white.
 */
const BRAND_COLORS: Record<string, string> = {
  ghost: "#C7FF00",
  ghostenergy: "#C7FF00",
  c4: "#FFC400",
  c4energy: "#FFC400",
  monster: "#00C853",
  redbull: "#1748FF",
  cocacola: "#F0003C",
  pepsi: "#005BFF",
  fanta: "#FF5A00",
  sprite: "#00C853",
  rockstar: "#FFD000",
  burn: "#FF3B00",
  prime: "#2855FF",
  kongstrong: "#FF3B1F",
  alaninu: "#FF3E9D",
  abe: "#2678FF",
  celsius: "#00CFFF",
  bang: "#8A2BFF",
  reign: "#A6F000",
  gatorade: "#FF5A00",
  hell: "#F0003C",
  redbullorganics: "#00A86B",
  nos: "#FF9D00",
  reignstorm: "#A6F000",
  ripit: "#FF3B1F",
  cult: "#F0003C",
  booster: "#FFB800",
};

function normalizeBrandName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isUsableBrandColor(value?: string | null): value is string {
  return !!value && /^#[0-9a-f]{6}$/i.test(value.trim()) && !["#000000", "#ffffff", "#64748b", "#808080"].includes(value.trim().toLowerCase());
}

/** Preserve a colour's hue while pushing it into Cansdex's saturated electric range. */
function electricizeColor(hex: string): string {
  const raw = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  let saturation = 0;
  let lightness = (max + min) / 2;
  const delta = max - min;
  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  } else {
    h = 220;
  }
  saturation = Math.max(saturation, 0.84);
  lightness = Math.min(0.58, Math.max(0.42, lightness));
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lightness - c / 2;
  const sector = Math.floor(h / 60);
  const rgb = sector === 0 ? [c, x, 0] : sector === 1 ? [x, c, 0] : sector === 2 ? [0, c, x] : sector === 3 ? [0, x, c] : sector === 4 ? [x, 0, c] : [c, 0, x];
  return "#" + rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

/** Stable fallback colour so every brand gets its own identity, even without a DB colour. */
function generatedBrandColor(name: string): string {
  const palette = ["#20A4A8", "#8B5CF6", "#D97736", "#C44569", "#2678FF", "#78952B", "#B45A9B", "#A66A36", "#477D72", "#6574C4", "#C05A42", "#6C8FAD"];
  const key = normalizeBrandName(name);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length] ?? "#20A4A8";
}

/** Resolve a distinctive accent for a brand without forcing colour onto the whole interface. */
export function getBrandColor(name?: string | null, storedColor?: string | null): string {
  const key = normalizeBrandName(name ?? "");
  const mapped = BRAND_COLORS[key] ?? Object.entries(BRAND_COLORS).find(([brandKey]) => key.includes(brandKey) || brandKey.includes(key))?.[1];
  if (mapped) return mapped;
  if (isUsableBrandColor(storedColor)) return electricizeColor(storedColor.trim());
  return generatedBrandColor(name || "Cansdex");
}

/** Return a can's saturated accent for vivid collection and discussion surfaces. */
export function canAccentColor(color?: string | null): string {
  const match = color?.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return "#ffffff";
  const hex = match[1] ?? "";
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return electricizeColor("#" + channels.map((channel) => channel.toString(16).padStart(2, "0")).join(""));
}
