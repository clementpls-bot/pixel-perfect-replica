export type AchievementInput = {
  ownedCanIds: Set<string>;
  cans: { id: string; brand_id: string; category: string; flavour?: string | null; release_year?: number | null }[];
  brands: { id: string; slug: string }[];
};

export type Achievement = { id: string; title: string; description: string; icon: string; earned: boolean };

export function computeAchievements({ ownedCanIds, cans, brands }: AchievementInput): Achievement[] {
  const owned = ownedCanIds.size;
  const ownedCans = cans.filter((can) => ownedCanIds.has(can.id));
  const ownedBrandIds = new Set(ownedCans.map((can) => can.brand_id));
  const ownedCategories = new Set(ownedCans.map((can) => can.category).filter(Boolean));
  const ownedFlavours = new Set(ownedCans.map((can) => can.flavour?.trim()).filter((flavour): flavour is string => Boolean(flavour)));
  const ownedYears = ownedCans.map((can) => can.release_year).filter((year): year is number => year != null);
  const ownedDecades = new Set(ownedYears.map((year) => Math.floor(year / 10) * 10));
  const limited = ownedCans.filter((can) => can.category === "Limited Edition").length;
  const brandComplete = (brandId: string) => {
    const list = cans.filter((can) => can.brand_id === brandId);
    return list.length > 0 && list.every((can) => ownedCanIds.has(can.id));
  };
  const completeBrandCount = brands.filter((brand) => brandComplete(brand.id)).length;
  const monster = brands.find((brand) => brand.slug === "monster");
  const redBull = brands.find((brand) => brand.slug === "red-bull");
  const completion = cans.length === 0 ? 0 : owned / cans.length;
  const hasVintageCan = ownedYears.some((year) => year < 2000);
  const hasRecentCan = ownedYears.some((year) => year >= 2025);

  return [
    { id: "first", title: "First Scan", description: "Add your first can", icon: "🔍", earned: owned >= 1 },
    { id: "5", title: "Getting Started", description: "Collect 5 unique cans", icon: "🥫", earned: owned >= 5 },
    { id: "10", title: "Collect 10 Cans", description: "Collect 10 unique cans", icon: "🥉", earned: owned >= 10 },
    { id: "25", title: "Quarter Century", description: "Collect 25 unique cans", icon: "🧃", earned: owned >= 25 },
    { id: "50", title: "Collect 50 Cans", description: "Collect 50 unique cans", icon: "🥈", earned: owned >= 50 },
    { id: "100", title: "Century Club", description: "Collect 100 unique cans", icon: "🥇", earned: owned >= 100 },
    { id: "250", title: "Can Connoisseur", description: "Collect 250 unique cans", icon: "🏅", earned: owned >= 250 },
    { id: "500", title: "Half-Thousand Hoard", description: "Collect 500 unique cans", icon: "🏆", earned: owned >= 500 },
    { id: "1000", title: "Legendary Collector", description: "Collect 1,000 unique cans", icon: "👑", earned: owned >= 1000 },
    { id: "brand", title: "Brand Master", description: "Complete a brand collection", icon: "🎯", earned: completeBrandCount >= 1 },
    { id: "brands-2", title: "Double Trouble", description: "Complete 2 brand collections", icon: "🎖️", earned: completeBrandCount >= 2 },
    { id: "brands-5", title: "Brand Tycoon", description: "Complete 5 brand collections", icon: "🏆", earned: completeBrandCount >= 5 },
    { id: "brand-variety-10", title: "Brand Explorer", description: "Own cans from 10 different brands", icon: "🌍", earned: ownedBrandIds.size >= 10 },
    { id: "monster", title: "Every Monster", description: "Collect every Monster can", icon: "🟢", earned: !!monster && brandComplete(monster.id) },
    { id: "red-bull", title: "Gives You Wings", description: "Collect every Red Bull can", icon: "🐂", earned: !!redBull && brandComplete(redBull.id) },
    { id: "limited", title: "Limited Edition Hunter", description: "Own 3 limited editions", icon: "💎", earned: limited >= 3 },
    { id: "limited-5", title: "Rare Finds", description: "Own 5 limited editions", icon: "✨", earned: limited >= 5 },
    { id: "limited-10", title: "Edition Elite", description: "Own 10 limited editions", icon: "💠", earned: limited >= 10 },
    { id: "categories-2", title: "Variety Pack", description: "Collect cans from 2 categories", icon: "🗂️", earned: ownedCategories.size >= 2 },
    { id: "categories-4", title: "Category Conqueror", description: "Collect cans from 4 categories", icon: "🧭", earned: ownedCategories.size >= 4 },
    { id: "flavours-5", title: "Flavor Explorer", description: "Collect 5 different listed flavours", icon: "🍒", earned: ownedFlavours.size >= 5 },
    { id: "flavours-10", title: "Flavor Expert", description: "Collect 10 different listed flavours", icon: "👅", earned: ownedFlavours.size >= 10 },
    { id: "years-3", title: "Time Traveler", description: "Own cans released in 3 different years", icon: "⏳", earned: new Set(ownedYears).size >= 3 },
    { id: "decades-3", title: "Across the Decades", description: "Own cans from 3 different decades", icon: "📆", earned: ownedDecades.size >= 3 },
    { id: "vintage", title: "Vintage Hunter", description: "Own a can released before 2000", icon: "📻", earned: hasVintageCan },
    { id: "recent", title: "Fresh Off the Line", description: "Own a can released in 2025 or later", icon: "🆕", earned: hasRecentCan },
    { id: "catalog-25", title: "Catalog Starter", description: "Collect 25% of the full catalog", icon: "📈", earned: completion >= 0.25 },
    { id: "catalog-50", title: "Halfway There", description: "Collect 50% of the full catalog", icon: "🚀", earned: completion >= 0.5 },
    { id: "catalog-75", title: "Almost Complete", description: "Collect 75% of the full catalog", icon: "🔥", earned: completion >= 0.75 },
    { id: "catalog-100", title: "Catalog Completionist", description: "Collect every can in the catalog", icon: "💯", earned: cans.length > 0 && owned >= cans.length },
  ];
}

export function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}
