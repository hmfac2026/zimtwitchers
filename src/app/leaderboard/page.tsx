import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "../birds/AppHeader";
import { LeaderboardTabs, type Tab } from "./LeaderboardTabs";

type Row = {
  user_id: string;
  display_name: string;
  weekly_sightings: number;
  weekly_species: number;
  life_list_size: number;
  rarity_score: number;
};

const TABS: Tab[] = [
  { id: "weekly_sightings", label: "Week — sightings", shortLabel: "Wk · count" },
  { id: "weekly_species",   label: "Week — species",   shortLabel: "Wk · spp" },
  { id: "life_list_size",   label: "All-time life list", shortLabel: "Life list" },
  { id: "rarity_score",     label: "Rarity score",      shortLabel: "Rarity" },
];

const TAB_DESCRIPTION: Record<string, string> = {
  weekly_sightings: "Most sightings logged in the last 7 days.",
  weekly_species: "Most distinct species logged in the last 7 days.",
  life_list_size: "Total distinct species ever logged.",
  rarity_score: "Common = 1, Uncommon = 3, Rare = 5, Very Rare = 10. Each species counts once.",
};

const METRIC: Record<string, keyof Row> = {
  weekly_sightings: "weekly_sightings",
  weekly_species:   "weekly_species",
  life_list_size:   "life_list_size",
  rarity_score:     "rarity_score",
};

type SearchParams = Promise<{ tab?: string }>;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  const sp = await searchParams;
  const activeTab = TABS.some((t) => t.id === sp.tab) ? sp.tab! : TABS[0].id;
  const metric = METRIC[activeTab];

  const { data, error } = await supabase.rpc("leaderboard_for_group", {
    p_group_id: membership.group_id,
  });

  const rows = ((data ?? []) as Row[])
    .map((r) => ({
      ...r,
      weekly_sightings: Number(r.weekly_sightings),
      weekly_species: Number(r.weekly_species),
      life_list_size: Number(r.life_list_size),
      rarity_score: Number(r.rarity_score),
    }))
    .sort((a, b) => Number(b[metric]) - Number(a[metric]));

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="leaderboard" />
      <RealtimeRefresher
        channel={`leaderboard-${membership.group_id}`}
        subscriptions={[
          { table: "sightings", filter: `group_id=eq.${membership.group_id}` },
        ]}
      />

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h1>Leaderboard</h1>
            <p className="text-base text-brown/65">
              {TAB_DESCRIPTION[activeTab]}
            </p>
          </header>

          <LeaderboardTabs tabs={TABS} active={activeTab} />

          {error ? (
            <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <p className="text-sm text-pitta-red">
                Couldn&apos;t load the leaderboard: {error.message}
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
              <h2 className="!text-xl">No twitchers yet</h2>
              <p className="mt-2 text-sm text-brown/65">
                Once your flock starts logging sightings they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <ol className="flex flex-col divide-y divide-brown/10 rounded-xl bg-card ring-1 ring-foreground/10">
              {rows.map((r, i) => {
                const isYou = r.user_id === user.id;
                const isLeader = i === 0 && Number(r[metric]) > 0;
                const value = Number(r[metric]);
                return (
                  <li key={r.user_id} className="px-4 py-3 sm:px-5">
                    <Link
                      href={isYou ? "/me" : `/life-list/${r.user_id}`}
                      className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1 hover:bg-cream/40"
                    >
                      <span
                        className={`w-6 text-center text-sm font-semibold tabular-nums ${
                          isLeader ? "text-mustard" : "text-brown/55"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <Avatar name={r.display_name} size="md" />
                      <div className="flex flex-1 flex-col">
                        <span className="font-medium text-brown">
                          {r.display_name}
                          {isYou ? (
                            <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brown/70">
                              you
                            </span>
                          ) : null}
                        </span>
                        <SecondaryStats row={r} active={metric} />
                      </div>
                      <span className="font-serif text-2xl font-medium tabular-nums text-forest">
                        {value.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </main>
    </div>
  );
}

function SecondaryStats({
  row,
  active,
}: {
  row: Row;
  active: keyof Row;
}) {
  const items: { key: keyof Row; label: string }[] = [
    { key: "weekly_sightings", label: "wk" },
    { key: "life_list_size", label: "life" },
    { key: "rarity_score", label: "score" },
  ];

  return (
    <span className="text-xs text-brown/55">
      {items
        .filter((it) => it.key !== active)
        .map((it) => `${Number(row[it.key]).toLocaleString()} ${it.label}`)
        .join(" · ")}
    </span>
  );
}
