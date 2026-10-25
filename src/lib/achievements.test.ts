import { describe, it, expect } from "vitest";
import { computeAchievements, pct } from "./achievements";

const brands = [{ id: "m", slug: "monster" }, { id: "r", slug: "red-bull" }];
const cans = [
  { id: "a", brand_id: "m", category: "Energy Drink" },
  { id: "b", brand_id: "m", category: "Limited Edition" },
  { id: "c", brand_id: "r", category: "Energy Drink" },
];
const get = (owned: string[], id: string) =>
  computeAchievements({ ownedCanIds: new Set(owned), cans, brands }).find((a) => a.id === id)!.earned;

describe("achievements", () => {
  it("first scan after one can", () => {
    expect(get([], "first")).toBe(false);
    expect(get(["a"], "first")).toBe(true);
  });
  it("every monster requires all monster cans", () => {
    expect(get(["a"], "monster")).toBe(false);
    expect(get(["a", "b"], "monster")).toBe(true);
  });
  it("percent rounds", () => {
    expect(pct(32, 48)).toBe(67);
    expect(pct(0, 0)).toBe(0);
  });
});
