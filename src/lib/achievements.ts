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
  const hasVintageCan = ownedYears.some((year) => year < 2000);
  const hasRecentCan = ownedYears.some((year) => year >= 2025);

  return [
    { id: "first", title: "Premier scan", description: "Ajoute ta première canette", icon: "🔍", earned: owned >= 1 },
    { id: "5", title: "Bien démarrer", description: "Collectionne 5 canettes différentes", icon: "🥫", earned: owned >= 5 },
    { id: "10", title: "10 canettes", description: "Collectionne 10 canettes différentes", icon: "🥉", earned: owned >= 10 },
    { id: "25", title: "Un quart de centaine", description: "Collectionne 25 canettes différentes", icon: "🧃", earned: owned >= 25 },
    { id: "50", title: "50 canettes", description: "Collectionne 50 canettes différentes", icon: "🥈", earned: owned >= 50 },
    { id: "100", title: "Club des 100", description: "Collectionne 100 canettes différentes", icon: "🥇", earned: owned >= 100 },
    { id: "250", title: "Connaisseur de canettes", description: "Collectionne 250 canettes différentes", icon: "🏅", earned: owned >= 250 },
    { id: "500", title: "Collection de 500", description: "Collectionne 500 canettes différentes", icon: "🏆", earned: owned >= 500 },
    { id: "1000", title: "Collectionneur légendaire", description: "Collectionne 1 000 canettes différentes", icon: "👑", earned: owned >= 1000 },
    { id: "brand", title: "Maître des marques", description: "Complète la collection d’une marque", icon: "🎯", earned: completeBrandCount >= 1 },
    { id: "brands-2", title: "Double défi", description: "Complète 2 collections de marques", icon: "🎖️", earned: completeBrandCount >= 2 },
    { id: "brands-5", title: "Magnat des marques", description: "Complète 5 collections de marques", icon: "🏆", earned: completeBrandCount >= 5 },
    { id: "brand-variety-10", title: "Explorateur de marques", description: "Possède des canettes de 10 marques différentes", icon: "🌍", earned: ownedBrandIds.size >= 10 },
    { id: "monster", title: "Tous les Monster", description: "Collectionne toutes les canettes Monster", icon: "🟢", earned: !!monster && brandComplete(monster.id) },
    { id: "red-bull", title: "Ça donne des ailes", description: "Collectionne toutes les canettes Red Bull", icon: "🐂", earned: !!redBull && brandComplete(redBull.id) },
    { id: "limited", title: "Chasseur d’éditions limitées", description: "Possède 3 éditions limitées", icon: "💎", earned: limited >= 3 },
    { id: "limited-5", title: "Trouvailles rares", description: "Possède 5 éditions limitées", icon: "✨", earned: limited >= 5 },
    { id: "limited-10", title: "Élite des éditions", description: "Possède 10 éditions limitées", icon: "💠", earned: limited >= 10 },
    { id: "categories-2", title: "Collection variée", description: "Collectionne des canettes de 2 catégories", icon: "🗂️", earned: ownedCategories.size >= 2 },
    { id: "categories-4", title: "Maître des catégories", description: "Collectionne des canettes de 4 catégories", icon: "🧭", earned: ownedCategories.size >= 4 },
    { id: "flavours-5", title: "Explorateur de saveurs", description: "Collectionne 5 saveurs différentes répertoriées", icon: "🍒", earned: ownedFlavours.size >= 5 },
    { id: "flavours-10", title: "Expert en saveurs", description: "Collectionne 10 saveurs différentes répertoriées", icon: "👅", earned: ownedFlavours.size >= 10 },
    { id: "years-3", title: "Voyageur du temps", description: "Possède des canettes sorties sur 3 années différentes", icon: "⏳", earned: new Set(ownedYears).size >= 3 },
    { id: "decades-3", title: "À travers les décennies", description: "Possède des canettes de 3 décennies différentes", icon: "📆", earned: ownedDecades.size >= 3 },
    { id: "vintage", title: "Chasseur de vintage", description: "Possède une canette sortie avant 2000", icon: "📻", earned: hasVintageCan },
    { id: "recent", title: "Tout juste sortie", description: "Possède une canette sortie en 2025 ou après", icon: "🆕", earned: hasRecentCan },
  ];
}

export function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}
