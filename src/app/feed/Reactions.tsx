"use client";

import { useOptimistic, useTransition } from "react";
import { cn } from "@/lib/utils";
import { toggleReaction } from "./actions";

const EMOJIS = ["👍", "🦅", "🔥"] as const;
type Emoji = (typeof EMOJIS)[number];

type Counts = Record<Emoji, number>;
type Reacted = Record<Emoji, boolean>;

type ReactionsProps = {
  sightingId: string;
  counts: Counts;
  reacted: Reacted;
};

export function Reactions({ sightingId, counts, reacted }: ReactionsProps) {
  const [, startTransition] = useTransition();
  const [state, setState] = useOptimistic<{ counts: Counts; reacted: Reacted }>(
    { counts, reacted },
  );

  function toggle(emoji: Emoji) {
    startTransition(() => {
      setState((prev) => {
        const wasReacted = prev.reacted[emoji];
        return {
          counts: {
            ...prev.counts,
            [emoji]: prev.counts[emoji] + (wasReacted ? -1 : 1),
          },
          reacted: { ...prev.reacted, [emoji]: !wasReacted },
        };
      });
      void toggleReaction(sightingId, emoji);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {EMOJIS.map((e) => {
        const count = state.counts[e];
        const isOn = state.reacted[e];
        return (
          <button
            key={e}
            type="button"
            onClick={() => toggle(e)}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-sm transition",
              isOn
                ? "bg-mustard/40 ring-1 ring-mustard"
                : "bg-cream/40 hover:bg-cream/70 ring-1 ring-transparent",
            )}
            aria-pressed={isOn}
            aria-label={`React with ${e}${count > 0 ? `, ${count} so far` : ""}`}
          >
            <span>{e}</span>
            {count > 0 ? (
              <span className="text-xs font-medium tabular-nums text-brown/80">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
