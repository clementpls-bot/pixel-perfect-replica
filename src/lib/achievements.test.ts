import { describe, it, expect } from "vitest";
import { computeAchievements, pct } from "./achievements";

const brands = [{ id: "m", slug: "monster" }, { id: "r", slug: "red-bull" }];
const cans = [
  { id: "a", brand_id: "m", category: "Energy Drink", flavour: "Original", release_year: 2020 },
  { id: "b", brand_id: "m", category: "Limited Edition", flavour: "Mango", release_year: 2021 },
  { id: "c", brand_id: "r", category: "Energy Drink", flavour: "Original", release_year: 1998 },
];
const getAll = (owned: string[]) =>
  computeAchievements({ ownedCanIds: new Set(owned), cans, brands });
const get = (owned: string[], id: string) => getAll(owned).find((a) => a.id === id)!.earned;

describe("achievements", () => {
  it("defines 26 unique achievements", () => {
    const achievements = getAll([]);
    expect(achievements).toHaveLength(26);
    expect(new Set(achievements.map((a) => a.id)).size).toBe(30);
  });

  it("first scan unlocks after one can", () => {
    expect(get([], "first")).toBe(false);
    expect(get(["a"], "first")).toBe(true);
  });

  it("every Monster requires all Monster cans", () => {
    expect(get(["a"], "monster")).toBe(false);
    expect(get(["a", "b"], "monster")).toBe(true);
  });

  it("brand master unlocks when a full brand is collected", () => {
    expect(get(["a"], "brand")).toBe(false);
    expect(get(["a", "b"], "brand")).toBe(true);
  });

  it("vintage hunter checks the release year", () => {
    expect(get(["a"], "vintage")).toBe(false);
    expect(get(["c"], "vintage")).toBe(true);
  });

  it("keeps count milestones and brand-completion achievements without global catalog percentages", () => {
    expect(get(["a"], "first")).toBe(true);
    expect(get(["a", "b"], "brand")).toBe(true);
    expect(getAll(["a", "b", "c"]).some((achievement) => achievement.id.startsWith("catalog-"))).toBe(false);
  });

  it("percent rounds and handles empty totals", () => {
    expect(pct(32, 48)).toBe(67);
    expect(pct(0, 0)).toBe(0);
  });
});
