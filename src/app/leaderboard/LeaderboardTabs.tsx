"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export type Tab = {
  id: string;
  label: string;
  shortLabel?: string;
};

type LeaderboardTabsProps = {
  tabs: Tab[];
  active: string;
};

export function LeaderboardTabs({ tabs, active }: LeaderboardTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function pick(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", id);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => pick(t.id)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
            active === t.id
              ? "bg-forest text-bone"
              : "bg-cream/50 text-brown/75 hover:bg-cream",
          )}
        >
          <span className="sm:hidden">{t.shortLabel ?? t.label}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
