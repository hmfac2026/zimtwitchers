export type RarityTier = "common" | "uncommon" | "rare" | "very_rare";

export const RARITY_LABEL: Record<RarityTier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  very_rare: "Very Rare",
};

export const RARITY_SCORE: Record<RarityTier, number> = {
  common: 1,
  uncommon: 3,
  rare: 5,
  very_rare: 10,
};

export const RARITY_ORDER: RarityTier[] = [
  "common",
  "uncommon",
  "rare",
  "very_rare",
];
