/**
 * Ingest the eBird taxonomy into the `birds` table.
 *
 *   npm run ingest
 *
 * The script is idempotent — already-ingested species (matched by
 * `ebird_code`) are skipped, so it's safe to re-run after a crash or to
 * pick up new species. Rough timing: ~30–60 minutes for a clean run on
 * the full ~10,800-species worldwide catalog.
 */

import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

loadEnvFile(".env.local");

const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY  = required("SUPABASE_SERVICE_ROLE_KEY");
const EBIRD_KEY    = required("EBIRD_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UA = "ZimTwitchers/0.1 (https://zimtwitchers.vercel.app; private friend-group app)";
const WIKI_PAUSE_MS = 150;

// ---------------------------------------------------------------------------
// types

type RarityTier = "common" | "uncommon" | "rare" | "very_rare";

type EbirdTaxon = {
  speciesCode: string;
  comName: string;
  sciName: string;
  category: string;
  familyComName?: string;
  familySciName?: string;
};

type EbirdObs = {
  speciesCode: string;
  comName: string;
  sciName: string;
  howMany?: number;
};

type WikiSummary = {
  type?: string;
  title: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
};

// ---------------------------------------------------------------------------
// helpers

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var ${name}`);
    process.exit(1);
  }
  return v;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T>(
  url: string,
  init?: RequestInit & { retryOn429?: number },
): Promise<T> {
  const max = init?.retryOn429 ?? 3;
  for (let attempt = 0; attempt <= max; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 429 && attempt < max) {
      const wait = 2_000 * (attempt + 1);
      console.warn(`429 on ${url}; retrying in ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText} for ${url}`);
    }
    return (await res.json()) as T;
  }
  throw new Error("unreachable");
}

const eBirdHeaders = { "X-eBirdApiToken": EBIRD_KEY };

async function fetchEbird<T>(path: string): Promise<T> {
  return fetchJson<T>(`https://api.ebird.org/v2${path}`, {
    headers: eBirdHeaders,
  });
}

async function wikiSummary(title: string): Promise<WikiSummary | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (res.status === 404) return null;
  if (res.status === 429) {
    await sleep(2_000);
    return wikiSummary(title);
  }
  if (!res.ok) throw new Error(`Wikipedia ${title}: ${res.status}`);
  const data = (await res.json()) as WikiSummary;
  if (data.type === "disambiguation") return null;
  return data;
}

// Wikimedia restricts hot-linking to a specific set of pre-cached sizes:
// 120, 250, 330, 500, 960, 1280, 1920 (anything else returns 400). 500 px is
// the sweet spot for a mobile-first catalog grid + detail hero.
function upscaleThumbnail(url: string, width = 500): string {
  // Wikimedia thumbs look like .../{size}px-Filename.jpg.
  return url.replace(/\/(\d+)px-([^/]+)$/, `/${width}px-$2`);
}

function tierFromObsCount(c: number, p50: number, p80: number): RarityTier {
  if (c >= p80) return "common";
  if (c >= p50) return "uncommon";
  if (c >= 1)   return "rare";
  return "rare"; // in NA but no recent obs in our sample
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

// ---------------------------------------------------------------------------
// main

async function main() {
  // 1. existing rows for idempotency
  const { data: existing, error: exErr } = await supabase
    .from("birds")
    .select("ebird_code");
  if (exErr) throw new Error(`fetch existing: ${exErr.message}`);
  const existingCodes = new Set(existing?.map((r) => r.ebird_code) ?? []);
  console.log(`Existing birds in DB: ${existingCodes.size}`);

  // 2. eBird taxonomy
  console.log("Fetching eBird taxonomy…");
  const taxonomy = await fetchEbird<EbirdTaxon[]>(`/ref/taxonomy/ebird?fmt=json`);
  const species = taxonomy.filter((t) => t.category === "species");
  console.log(`Species in taxonomy: ${species.length}`);

  // 3. NA species lists
  console.log("Fetching US species list…");
  const usList = await fetchEbird<string[]>(`/product/spplist/US`);
  console.log("Fetching CA species list…");
  const caList = await fetchEbird<string[]>(`/product/spplist/CA`);
  const naSet = new Set([...usList, ...caList]);
  console.log(`NA species set: ${naSet.size}`);

  // 4. Recent NA observations → counts per species
  console.log("Fetching recent US observations (30d)…");
  const recentUS = await fetchEbird<EbirdObs[]>(
    `/data/obs/US/recent?back=30&maxResults=10000`,
  );
  const obsCount = new Map<string, number>();
  for (const o of recentUS) {
    obsCount.set(o.speciesCode, (obsCount.get(o.speciesCode) ?? 0) + 1);
  }
  const sortedCounts = [...obsCount.values()].sort((a, b) => a - b);
  const p50 = percentile(sortedCounts, 50);
  const p80 = percentile(sortedCounts, 80);
  console.log(
    `Observed species in 30d: ${obsCount.size}, p50=${p50}, p80=${p80}`,
  );

  // 5. Iterate species
  let inserted = 0;
  let skipped = 0;
  let withWiki = 0;
  let errors = 0;

  console.log(`\nIngesting ${species.length} species…\n`);

  for (let i = 0; i < species.length; i++) {
    const t = species[i];
    if (existingCodes.has(t.speciesCode)) {
      skipped++;
      continue;
    }

    try {
      const inNA = naSet.has(t.speciesCode);
      const count = obsCount.get(t.speciesCode) ?? 0;
      const rarity: RarityTier = !inNA
        ? "very_rare"
        : tierFromObsCount(count, p50, p80);

      let wiki: WikiSummary | null = null;
      try {
        wiki = await wikiSummary(t.comName);
        if (!wiki) wiki = await wikiSummary(t.sciName);
      } catch (e) {
        console.warn(`  wiki: ${t.comName} → ${(e as Error).message}`);
      }
      if (wiki) withWiki++;

      const photoUrl = wiki?.thumbnail?.source
        ? upscaleThumbnail(wiki.thumbnail.source, 640)
        : null;

      const row = {
        ebird_code:      t.speciesCode,
        common_name:     t.comName,
        scientific_name: t.sciName,
        family:          t.familySciName ?? null,
        family_common:   t.familyComName ?? null,
        description:     wiki?.extract ?? null,
        wiki_url:        wiki?.content_urls?.desktop?.page ?? null,
        photo_url:       photoUrl,
        range_regions:   inNA ? ["NA"] : [],
        rarity_tier:     rarity,
        na_frequency:    count,
      };

      const { error } = await supabase.from("birds").insert(row);
      if (error) throw new Error(error.message);
      inserted++;

      if (wiki) await sleep(WIKI_PAUSE_MS);
    } catch (e) {
      errors++;
      console.warn(`  ✗ ${t.comName} (${t.speciesCode}): ${(e as Error).message}`);
    }

    if ((i + 1) % 100 === 0 || i === species.length - 1) {
      const pct = (((i + 1) / species.length) * 100).toFixed(1);
      console.log(
        `  ${i + 1}/${species.length} (${pct}%) — inserted ${inserted}, skipped ${skipped}, with-wiki ${withWiki}, errors ${errors}`,
      );
    }
  }

  console.log(
    `\n✓ Done. inserted=${inserted}, skipped=${skipped}, with-wiki=${withWiki}, errors=${errors}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
