export type AchievementInput = {
  ownedCanIds: Set<string>;
  cans: { id: string; brand_id: string; category: string }[];
  brands: { id: string; slug: string }[];
};

export type Achievement = { id: string; title: string; description: string; icon: string; earned: boolean };

export function computeAchievements({ ownedCanIds, cans, brands }: AchievementInput): Achievement[] {
  const owned = ownedCanIds.size;
  const brandComplete = (brandId: string) => {
    const list = cans.filter((c) => c.brand_id === brandId);
    return list.length > 0 && list.every((c) => ownedCanIds.has(c.id));
  };
  const monster = brands.find((b) => b.slug === "monster");
  const limited = cans.filter((c) => c.category === "Limited Edition" && ownedCanIds.has(c.id)).length;
  return [
    { id: "first", title: "First Scan", description: "Add your first can", icon: "🔍", earned: owned >= 1 },
    { id: "10", title: "Collect 10 Cans", description: "10 unique cans", icon: "🥉", earned: owned >= 10 },
    { id: "50", title: "Collect 50 Cans", description: "50 unique cans", icon: "🥈", earned: owned >= 50 },
    { id: "100", title: "Collect 100 Cans", description: "100 unique cans", icon: "🥇", earned: owned >= 100 },
    { id: "brand", title: "Brand Master", description: "Complete a brand collection", icon: "👑", earned: brands.some((b) => brandComplete(b.id)) },
    { id: "monster", title: "Every Monster", description: "Collect every Monster can", icon: "🟢", earned: !!monster && brandComplete(monster.id) },
    { id: "limited", title: "Limited Edition Hunter", description: "Own 3 limited editions", icon: "💎", earned: limited >= 3 },
  ];
}

export function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}
