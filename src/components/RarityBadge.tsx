import { cn } from "@/lib/utils";
import { RARITY_LABEL, type RarityTier } from "@/lib/rarity";

type RarityBadgeProps = {
  tier: RarityTier;
  size?: "sm" | "md";
  className?: string;
};

const STYLES: Record<RarityTier, string> = {
  common: "bg-cream text-brown",
  uncommon: "bg-mustard text-brown",
  rare: "bg-pitta-blue text-white",
  very_rare: "bg-pitta-red text-white",
};

const SIZES = {
  sm: "text-[0.7rem] px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

export function RarityBadge({ tier, size = "md", className }: RarityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium uppercase tracking-wide",
        STYLES[tier],
        SIZES[size],
        className,
      )}
    >
      {RARITY_LABEL[tier]}
    </span>
  );
}
