import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { RarityBadge } from "@/components/RarityBadge";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { type RarityTier } from "@/lib/rarity";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "../birds/AppHeader";
import { Reactions } from "./Reactions";

const PAGE_SIZE = 50;

type SightingRow = {
  id: string;
  user_id: string;
  observed_at: string;
  count: number;
  notes: string | null;
  photo_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  birds: {
    ebird_code: string;
    common_name: string;
    scientific_name: string;
    photo_url: string | null;
    rarity_tier: RarityTier;
  } | null;
};

const EMOJIS = ["👍", "🦅", "🔥"] as const;
type Emoji = (typeof EMOJIS)[number];

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const groupId = membership.group_id;

  const { data: sightingsData } = await supabase
    .from("sightings")
    .select(
      "id, user_id, observed_at, count, notes, photo_url, location_lat, location_lng, birds(ebird_code, common_name, scientific_name, photo_url, rarity_tier)",
    )
    .eq("group_id", groupId)
    .order("observed_at", { ascending: false })
    .limit(PAGE_SIZE);

  const sightings = (sightingsData ?? []) as unknown as SightingRow[];

  // Names + reactions for all sightings shown.
  const userIds = [...new Set(sightings.map((s) => s.user_id))];
  const sightingIds = sightings.map((s) => s.id);

  const { data: members } = userIds.length
    ? await supabase
        .from("group_members")
        .select("user_id, display_name")
        .eq("group_id", groupId)
        .in("user_id", userIds)
    : { data: [] as { user_id: string; display_name: string }[] };

  const nameByUser = new Map(
    (members ?? []).map((m) => [m.user_id, m.display_name]),
  );

  const { data: reactionRows } = sightingIds.length
    ? await supabase
        .from("reactions")
        .select("sighting_id, emoji, user_id")
        .in("sighting_id", sightingIds)
    : { data: [] as { sighting_id: string; emoji: string; user_id: string }[] };

  const reactionsBySighting = new Map<
    string,
    { counts: Record<Emoji, number>; reacted: Record<Emoji, boolean> }
  >();
  for (const id of sightingIds) {
    reactionsBySighting.set(id, {
      counts: { "👍": 0, "🦅": 0, "🔥": 0 },
      reacted: { "👍": false, "🦅": false, "🔥": false },
    });
  }
  for (const r of reactionRows ?? []) {
    if (!EMOJIS.includes(r.emoji as Emoji)) continue;
    const bucket = reactionsBySighting.get(r.sighting_id);
    if (!bucket) continue;
    bucket.counts[r.emoji as Emoji] += 1;
    if (r.user_id === user.id) bucket.reacted[r.emoji as Emoji] = true;
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="feed" />
      <RealtimeRefresher
        channel={`feed-${groupId}`}
        subscriptions={[
          { table: "sightings", filter: `group_id=eq.${groupId}` },
          { table: "reactions" },
        ]}
      />

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h1>Feed</h1>
            <p className="text-base text-brown/65">
              Recent sightings from your flock. Updates live.
            </p>
          </header>

          {sightings.length === 0 ? (
            <div className="rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
              <h2 className="!text-xl">Quiet so far</h2>
              <p className="mt-2 text-sm text-brown/65">
                No one in your flock has logged a sighting yet. Be the first —{" "}
                <Link href="/birds" className="text-forest underline">
                  open the catalog
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {sightings.map((s) => {
                const bird = s.birds;
                if (!bird) return null;
                const displayName = nameByUser.get(s.user_id) ?? "Twitcher";
                const r = reactionsBySighting.get(s.id)!;
                const photo = s.photo_url ?? bird.photo_url ?? null;
                return (
                  <li
                    key={s.id}
                    className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
                  >
                    <div className="flex items-start gap-3 p-4 sm:px-5">
                      <Avatar name={displayName} size="md" />
                      <div className="flex flex-1 flex-col gap-0.5">
                        <p className="text-sm">
                          <Link
                            href={
                              s.user_id === user.id
                                ? "/me"
                                : `/life-list/${s.user_id}`
                            }
                            className="font-semibold text-brown hover:text-forest"
                          >
                            {displayName}
                          </Link>{" "}
                          <span className="text-brown/65">
                            spotted{" "}
                            {s.count > 1 ? <strong>{s.count}×</strong> : "a"}
                          </span>{" "}
                          <Link
                            href={`/birds/${bird.ebird_code}`}
                            className="font-medium text-forest hover:underline"
                          >
                            {bird.common_name}
                          </Link>
                        </p>
                        <p className="text-xs text-brown/55">
                          {timeAgo(s.observed_at)}
                          {s.location_lat != null && s.location_lng != null
                            ? " · 📍 location pinned"
                            : ""}
                        </p>
                      </div>
                      <RarityBadge tier={bird.rarity_tier} size="sm" />
                    </div>

                    {photo ? (
                      <Link
                        href={`/birds/${bird.ebird_code}`}
                        className="relative block w-full bg-cream/30"
                        style={{ paddingBottom: "75%" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt={bird.common_name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </Link>
                    ) : null}

                    {s.notes ? (
                      <p className="px-5 pt-3 text-sm leading-relaxed text-brown/85">
                        {s.notes}
                      </p>
                    ) : null}

                    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                      <Reactions
                        sightingId={s.id}
                        counts={r.counts}
                        reacted={r.reacted}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
