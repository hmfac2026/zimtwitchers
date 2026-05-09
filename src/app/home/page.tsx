import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RARITY_SCORE, type RarityTier } from "@/lib/rarity";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "../birds/AppHeader";

type GroupRow = { name: string; invite_code: string };
type MemberRow = {
  user_id: string;
  display_name: string;
  joined_at: string;
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("group_members")
    .select("display_name, group_id, groups(name, invite_code)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const group = (
    Array.isArray(membership.groups) ? membership.groups[0] : membership.groups
  ) as GroupRow | null;

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, display_name, joined_at")
    .eq("group_id", membership.group_id)
    .order("joined_at", { ascending: true });

  const memberList = (members ?? []) as MemberRow[];

  const memberStats = await Promise.all(
    memberList.map(async (m) => ({
      ...m,
      stats: await statsFor(supabase, m.user_id, membership.group_id),
    })),
  );

  const me = memberStats.find((m) => m.user_id === user.id);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="home" />

      <main className="flex flex-1 flex-col px-4 py-10 sm:py-14">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
          <section className="flex flex-col items-center gap-3 text-center">
            <h1>Welcome, {membership.display_name}</h1>
            <p className="text-base text-brown/65">
              You&apos;re flocking with{" "}
              <strong className="text-forest">{group?.name}</strong>
              {memberList.length > 1
                ? ` and ${memberList.length - 1} other${memberList.length - 1 === 1 ? "" : "s"}.`
                : "."}
            </p>
          </section>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-xl">Browse the catalog</CardTitle>
                <CardDescription>
                  Search and filter the world&apos;s birds. Tap one to log it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/birds"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "w-full sm:w-auto sm:px-6",
                  )}
                >
                  Open catalog
                </Link>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-xl">Your life list</CardTitle>
                <CardDescription>
                  {me && me.stats.uniqueSpecies > 0
                    ? `${me.stats.uniqueSpecies} species, ${me.stats.totalSightings} sightings.`
                    : "Nothing logged yet."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/me"
                  className={cn(
                    buttonVariants({ size: "default", variant: "outline" }),
                    "border-brown/25 text-brown hover:bg-cream/50 w-full sm:w-auto sm:px-6",
                  )}
                >
                  View your list
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{group?.name}</CardTitle>
              <CardDescription>
                {memberList.length}{" "}
                {memberList.length === 1 ? "twitcher" : "twitchers"} in this
                flock. Tap a name to see what they&apos;ve spotted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y divide-brown/10">
                {memberStats.map((m) => {
                  const isYou = m.user_id === user.id;
                  return (
                    <li key={m.user_id} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        href={isYou ? "/me" : `/life-list/${m.user_id}`}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1 -mx-2 hover:bg-cream/40"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-brown">
                            {m.display_name}
                            {isYou ? (
                              <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brown/70">
                                you
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs text-brown/55">
                            {m.stats.uniqueSpecies} species ·{" "}
                            {m.stats.totalSightings} sightings · score{" "}
                            {m.stats.rarityScore}
                          </span>
                        </div>
                        <span className="text-brown/40">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Invite code</CardTitle>
              <CardDescription>
                Share this with friends so they can join {group?.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block w-full rounded-md bg-cream/60 px-4 py-4 text-center font-mono text-2xl tracking-[0.3em] text-forest">
                {group?.invite_code}
              </code>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

type Stats = {
  totalSightings: number;
  uniqueSpecies: number;
  rarityScore: number;
};

async function statsFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  groupId: string,
): Promise<Stats> {
  const { data } = await supabase
    .from("sightings")
    .select("bird_id, count, birds!inner(rarity_tier)")
    .eq("user_id", userId)
    .eq("group_id", groupId);

  const rows =
    (data ?? []) as unknown as Array<{
      bird_id: string;
      count: number;
      birds: { rarity_tier: RarityTier };
    }>;

  let totalSightings = 0;
  const seen = new Map<string, RarityTier>();
  for (const r of rows) {
    totalSightings += r.count ?? 1;
    if (!seen.has(r.bird_id)) seen.set(r.bird_id, r.birds.rarity_tier);
  }
  const rarityScore = [...seen.values()].reduce(
    (s, t) => s + (RARITY_SCORE[t] ?? 0),
    0,
  );
  return {
    totalSightings,
    uniqueSpecies: seen.size,
    rarityScore,
  };
}
