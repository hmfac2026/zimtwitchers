import Image from "next/image";
import Link from "next/link";
import { RarityBadge } from "@/components/RarityBadge";
import type { RarityTier } from "@/lib/rarity";

type BirdCardProps = {
  ebird_code: string;
  common_name: string;
  scientific_name: string;
  family_common: string | null;
  rarity_tier: RarityTier;
  photo_url: string | null;
  seen?: boolean;
};

export function BirdCard({
  ebird_code,
  common_name,
  scientific_name,
  family_common,
  rarity_tier,
  photo_url,
  seen,
}: BirdCardProps) {
  return (
    <Link
      href={`/birds/${ebird_code}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition hover:ring-foreground/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
    >
      <div className="relative aspect-[4/3] w-full bg-cream/30">
        {photo_url ? (
          <Image
            src={photo_url}
            alt={common_name}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition group-hover:scale-[1.02]"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-brown/30">
            🪶
          </div>
        )}
        {seen ? (
          <span className="absolute right-2 top-2 rounded-full bg-forest px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-bone">
            Seen
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <h3 className="font-serif text-base font-medium leading-tight text-forest">
          {common_name}
        </h3>
        <p className="text-xs italic text-brown/60">{scientific_name}</p>
        <div className="mt-1 flex items-center gap-2">
          <RarityBadge tier={rarity_tier} size="sm" />
          {family_common ? (
            <span className="truncate text-xs text-brown/55">{family_common}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
