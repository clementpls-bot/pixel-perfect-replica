import { describe, expect, it } from "vitest";
import { getProfileRingColor, PROFILE_RING_COLORS } from "./profile-colors";

describe("profile ring choices", () => {
  it("offers exactly twelve distinct colors", () => {
    expect(PROFILE_RING_COLORS).toHaveLength(12);
    expect(new Set(PROFILE_RING_COLORS.map((color) => color.id)).size).toBe(12);
  });
  it("preserves every selectable color and falls back for unknown values", () => {
    for (const color of PROFILE_RING_COLORS) expect(getProfileRingColor(color.id)).toBe(color.id);
    expect(getProfileRingColor("not-a-color")).toBe("amber");
  });
});