export const PROFILE_RING_COLORS = [
  { id: "amber", label: "Ambre" },
  { id: "coral", label: "Corail" },
  { id: "rose", label: "Rose" },
  { id: "red", label: "Rouge" },
  { id: "violet", label: "Violet" },
  { id: "blue", label: "Bleu" },
  { id: "sky", label: "Ciel" },
  { id: "teal", label: "Turquoise" },
  { id: "mint", label: "Menthe" },
  { id: "green", label: "Vert" },
  { id: "yellow", label: "Jaune" },
  { id: "graphite", label: "Graphite" },
] as const;

export type ProfileRingColor = typeof PROFILE_RING_COLORS[number]["id"];
export function getProfileRingColor(value: unknown): ProfileRingColor {
  return PROFILE_RING_COLORS.find((color) => color.id === value)?.id ?? "amber";
}