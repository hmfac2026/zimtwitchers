import Link from "next/link";
import { RarityBadge } from "@/components/RarityBadge";
import { RARITY_SCORE, type RarityTier } from "@/lib/rarity";
import { createClient } from "@/lib/supabase/server";

type LifeListProps = {
  /** The user whose life list to render. */
  userId: string;
  /** Heading text — pass the display name. */
  displayName: string;
  /** True when this is the viewer's own life list. */
  isSelf: boolean;
  /** Group ID to scope read access. */
  groupId: string;
};

type SightingRow = {
  bird_id: string;
  observed_at: string;
  count: number;
  photos: string[] | null;
  birds: {
    id: string;
    ebird_code: string;
    common_name: string;
    scientific_name: string;
    photo_url: string | null;
    rarity_tier: RarityTier;
  } | null;
};

type AggregatedBird = {
  bird_id: string;
  ebird_code: string;
  common_name: string;
  scientific_name: string;
  rarity_tier: RarityTier;
  photo_url: string | null;
  sighting_count: number;
  most_recent: string;
  user_photo_url: string | null;
};

export async function LifeList({
  userId,
  displayName,
  isSelf,
  groupId,
}: LifeListProps) {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("sightings")
    .select(
      "bird_id, observed_at, count, photos, birds(id, ebird_code, common_name, scientific_name, photo_url, rarity_tier)",
    )
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .order("observed_at", { ascending: false });

  const sightings = (rows ?? []) as unknown as SightingRow[];

  // Aggregate by bird_id, keeping the most recent sighting's photo if any.
  const aggregated = new Map<string, AggregatedBird>();
  let totalSightings = 0;
  for (const s of sightings) {
    if (!s.birds) continue;
    totalSightings += s.count ?? 1;
    const firstPhoto = s.photos && s.photos.length > 0 ? s.photos[0] : null;
    const existing = aggregated.get(s.bird_id);
    if (existing) {
      existing.sighting_count += 1;
      if (!existing.user_photo_url && firstPhoto) {
        existing.user_photo_url = firstPhoto;
      }
    } else {
      aggregated.set(s.bird_id, {
        bird_id: s.bird_id,
        ebird_code: s.birds.ebird_code,
        common_name: s.birds.common_name,
        scientific_name: s.birds.scientific_name,
        rarity_tier: s.birds.rarity_tier,
        photo_url: s.birds.photo_url,
        sighting_count: 1,
        most_recent: s.observed_at,
        user_photo_url: firstPhoto,
      });
    }
  }

  const uniqueBirds = [...aggregated.values()];
  const rarityScore = uniqueBirds.reduce(
    (sum, b) => sum + (RARITY_SCORE[b.rarity_tier] ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-brown/55">
          {isSelf ? "Your life list" : "Life list"}
        </p>
        <h1>{isSelf ? "Your sightings" : displayName}</h1>
        {!isSelf ? (
          <p className="text-base text-brown/65">
            What {displayName} has spotted in this flock.
          </p>
        ) : null}
      </header>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Sightings" value={totalSightings} />
        <Stat label="Species" value={uniqueBirds.length} />
        <Stat label="Rarity score" value={rarityScore} highlight />
      </section>

      {uniqueBirds.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
          <h2 className="!text-xl">No birds yet</h2>
          <p className="mt-2 text-sm text-brown/65">
            {isSelf
              ? "Browse the catalog and tap Mark as seen to start your list."
              : `${displayName} hasn't logged anything yet.`}
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="!text-xl">
            {uniqueBirds.length} {uniqueBirds.length === 1 ? "species" : "species"}
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueBirds.map((b) => (
              <li key={b.bird_id}>
                <Link
                  href={`/birds/${b.ebird_code}`}
                  className="group relative flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition hover:ring-foreground/20"
                >
                  {b.user_photo_url || b.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.user_photo_url ?? b.photo_url ?? ""}
                      alt={b.common_name}
                      width="500"
                      height="375"
                      decoding="async"
                      className="block h-44 w-full bg-cream/30 object-cover sm:h-52"
                    />
                  ) : (
                    <div className="flex h-44 w-full items-center justify-center bg-cream/30 text-3xl text-brown/30 sm:h-52">
                      🪶
                    </div>
                  )}
                  {b.user_photo_url ? (
                    <span className="absolute left-2 top-2 rounded-full bg-forest/90 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-bone">
                      Your photo
                    </span>
                  ) : null}
                  <div className="flex flex-col gap-1.5 p-4">
                    <h3 className="font-serif text-base font-medium leading-tight text-forest">
                      {b.common_name}
                    </h3>
                    <p className="text-xs italic text-brown/60">
                      {b.scientific_name}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <RarityBadge tier={b.rarity_tier} size="sm" />
                      <span className="text-xs text-brown/55">
                        {b.sighting_count}× • {formatDate(b.most_recent)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl p-4 ring-1 ring-foreground/10 ${
        highlight ? "bg-mustard/30" : "bg-card"
      }`}
    >
      <span className="font-serif text-3xl font-medium leading-none text-forest">
        {value.toLocaleString()}
      </span>
      <span className="text-[0.7rem] uppercase tracking-wide text-brown/65">
        {label}
      </span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
