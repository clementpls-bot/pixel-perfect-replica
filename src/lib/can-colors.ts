/** Blend a can's main color with white to create a soft pastel comment background. */
export function pastelCanColor(color?: string | null): string {
  const match = color?.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return "hsl(var(--card))";
  const hex = match[1];
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return "#" + channels.map((channel) => Math.round(channel * 0.18 + 255 * 0.82).toString(16).padStart(2, "0")).join("");
}
