"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RARITY_LABEL, RARITY_ORDER, type RarityTier } from "@/lib/rarity";

type CatalogToolbarProps = {
  totalCount: number;
};

export function CatalogToolbar({ totalCount }: CatalogToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = params.get("q") ?? "";
  const rarity = (params.get("rarity") as RarityTier | null) ?? null;

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value && value.length > 0) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        placeholder="Search by name…"
        defaultValue={q}
        className="h-11 text-base"
        onChange={(e) => setParam("q", e.target.value.trim())}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-brown/55">Rarity:</span>
        <button
          type="button"
          onClick={() => setParam("rarity", null)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition",
            rarity === null
              ? "bg-forest text-bone"
              : "bg-cream/50 text-brown/70 hover:bg-cream",
          )}
        >
          All
        </button>
        {RARITY_ORDER.map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => setParam("rarity", rarity === tier ? null : tier)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              rarity === tier
                ? "bg-forest text-bone"
                : "bg-cream/50 text-brown/70 hover:bg-cream",
            )}
          >
            {RARITY_LABEL[tier]}
          </button>
        ))}
      </div>

      <p className="text-xs text-brown/55">
        {isPending ? "Searching…" : `${totalCount.toLocaleString()} species`}
      </p>
    </div>
  );
}
