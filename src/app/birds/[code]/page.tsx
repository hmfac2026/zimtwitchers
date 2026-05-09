import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { RarityBadge } from "@/components/RarityBadge";
import { cn } from "@/lib/utils";
import { type RarityTier } from "@/lib/rarity";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "../AppHeader";
import { MarkSeenForm } from "./MarkSeenForm";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function BirdDetailPage({ params }: Props) {
  const { code } = await params;

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

  const { data: bird } = await supabase
    .from("birds")
    .select(
      "id, ebird_code, common_name, scientific_name, family, family_common, description, wiki_url, photo_url, range_regions, rarity_tier",
    )
    .eq("ebird_code", code)
    .maybeSingle();

  if (!bird) notFound();

  const { data: sightings, count: sightingCount } = await supabase
    .from("sightings")
    .select("id", { count: "exact" })
    .eq("user_id", user.id)
    .eq("bird_id", bird.id);

  const alreadySeen = (sightings?.length ?? 0) > 0;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="catalog" />

      <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <Link
            href="/birds"
            className="inline-flex items-center text-sm text-brown/65 hover:text-brown"
          >
            ← Back to catalog
          </Link>

          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            <div className="relative aspect-[16/10] w-full bg-cream/40">
              {bird.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bird.photo_url}
                  alt={bird.common_name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl text-brown/30">
                  🪶
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5 p-6 sm:p-8">
              <header className="flex flex-col gap-2">
                <h1 className="!text-3xl sm:!text-4xl">{bird.common_name}</h1>
                <p className="font-serif text-base italic text-brown/65">
                  {bird.scientific_name}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <RarityBadge tier={bird.rarity_tier as RarityTier} />
                  {bird.family_common ? (
                    <span className="text-sm text-brown/65">
                      Family: <span className="text-brown">{bird.family_common}</span>
                      {bird.family ? (
                        <span className="text-brown/45"> ({bird.family})</span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              </header>

              {bird.description ? (
                <section className="text-base leading-relaxed text-brown/85">
                  {bird.description}
                </section>
              ) : (
                <p className="text-sm italic text-brown/55">
                  No description available yet.
                </p>
              )}

              {bird.range_regions && bird.range_regions.length > 0 ? (
                <p className="text-sm text-brown/65">
                  Range:{" "}
                  <span className="text-brown">
                    {bird.range_regions.join(", ")}
                  </span>
                </p>
              ) : null}

              <MarkSeenForm
                birdId={bird.id}
                alreadySeen={alreadySeen}
                totalSightings={sightingCount ?? 0}
              />

              {bird.wiki_url ? (
                <a
                  href={bird.wiki_url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ size: "sm", variant: "outline" }),
                    "border-brown/25 text-brown hover:bg-cream/50 self-start",
                  )}
                >
                  Read on Wikipedia →
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
