"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Subscription = {
  /** Postgres table name in `public` schema. */
  table: string;
  /** Optional row filter (PostgREST style), e.g. "group_id=eq.UUID". */
  filter?: string;
};

type RealtimeRefresherProps = {
  channel: string;
  subscriptions: Subscription[];
  /** Throttle window for refreshes (ms). Default 750ms. */
  throttleMs?: number;
};

/**
 * Subscribes to Supabase postgres_changes events for the given tables/filters
 * and triggers `router.refresh()` so the parent server component re-renders
 * with fresh data. Cheap and simple — no client-side state merging.
 */
export function RealtimeRefresher({
  channel,
  subscriptions,
  throttleMs = 750,
}: RealtimeRefresherProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let pending: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        router.refresh();
      }, throttleMs);
    };

    let ch = supabase.channel(channel);
    for (const sub of subscriptions) {
      ch = ch.on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        refresh,
      );
    }
    ch.subscribe();

    return () => {
      if (pending) clearTimeout(pending);
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, JSON.stringify(subscriptions), throttleMs]);

  return null;
}
