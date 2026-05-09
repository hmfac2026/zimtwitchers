import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { type RarityTier } from "@/lib/rarity";
import { AppHeader } from "./AppHeader";
import { BirdCard } from "./BirdCard";
import { CatalogToolbar } from "./CatalogToolbar";

const PAGE_SIZE = 60;

type SearchParams = Promise<{
  q?: string;
  rarity?: string;
  page?: string;
}>;

export default async function BirdCatalogPage({
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
  const q = sp.q?.trim() ?? "";
  const rarity = sp.rarity as RarityTier | undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("birds")
    .select(
      "ebird_code, common_name, scientific_name, family_common, rarity_tier, photo_url",
      { count: "exact" },
    )
    .order("common_name", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(
      `common_name.ilike.%${q}%,scientific_name.ilike.%${q}%`,
    );
  }
  if (rarity) {
    query = query.eq("rarity_tier", rarity);
  }

  const { data: birds, count } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Mark which birds the current user has already seen.
  const codes = birds?.map((b) => b.ebird_code) ?? [];
  let seenSet = new Set<string>();
  if (codes.length > 0) {
    const { data: birdRows } = await supabase
      .from("birds")
      .select("id, ebird_code")
      .in("ebird_code", codes);
    const idToCode = new Map((birdRows ?? []).map((r) => [r.id, r.ebird_code]));
    if (idToCode.size > 0) {
      const { data: seen } = await supabase
        .from("sightings")
        .select("bird_id")
        .eq("user_id", user.id)
        .in("bird_id", [...idToCode.keys()]);
      seenSet = new Set(
        (seen ?? []).map((s) => idToCode.get(s.bird_id)).filter(Boolean) as string[],
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="catalog" />

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <section className="flex flex-col gap-2">
            <h1>Bird catalog</h1>
            <p className="text-base text-brown/70">
              {totalCount > 0
                ? "Browse the world's birds. Tap one to log a sighting."
                : "The catalog hasn't been ingested yet — run the ingest script to populate it."}
            </p>
          </section>

          {totalCount === 0 && !q && !rarity ? (
            <EmptyState />
          ) : (
            <>
              <CatalogToolbar totalCount={totalCount} />

              {birds && birds.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {birds.map((b) => (
                    <BirdCard
                      key={b.ebird_code}
                      ebird_code={b.ebird_code}
                      common_name={b.common_name}
                      scientific_name={b.scientific_name}
                      family_common={b.family_common}
                      rarity_tier={b.rarity_tier as RarityTier}
                      photo_url={b.photo_url}
                      seen={seenSet.has(b.ebird_code)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-md bg-cream/50 p-6 text-center text-sm text-brown/70">
                  No birds matched your search.
                </p>
              )}

              <Pagination page={page} totalPages={totalPages} sp={sp} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl bg-card p-8 ring-1 ring-foreground/10">
      <h2 className="mb-2">Catalog is empty</h2>
      <p className="text-sm text-brown/70">
        Run the bird-ingest script locally to populate the catalog from the eBird
        taxonomy and Wikipedia. Takes about 30–60 minutes.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-md bg-cream/50 p-3 font-mono text-xs text-brown/80">
        npm run ingest
      </pre>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  sp,
}: {
  page: number;
  totalPages: number;
  sp: { q?: string; rarity?: string; page?: string };
}) {
  if (totalPages <= 1) return null;

  function urlFor(target: number) {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.rarity) params.set("rarity", sp.rarity);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return `/birds${qs ? `?${qs}` : ""}`;
  }

  const buttonCls = cn(
    buttonVariants({ size: "sm", variant: "outline" }),
    "border-brown/25 text-brown hover:bg-cream/50",
  );
  const disabledCls = cn(buttonCls, "pointer-events-none opacity-40");

  return (
    <nav className="flex items-center justify-between gap-4 pt-4">
      {page > 1 ? (
        <Link href={urlFor(page - 1)} className={buttonCls}>
          ← Prev
        </Link>
      ) : (
        <span className={disabledCls}>← Prev</span>
      )}
      <span className="text-xs text-brown/60">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={urlFor(page + 1)} className={buttonCls}>
          Next →
        </Link>
      ) : (
        <span className={disabledCls}>Next →</span>
      )}
    </nav>
  );
}
