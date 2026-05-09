"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { markAsSeen } from "./actions";

type State = { error?: string; ok?: boolean };

type Props = {
  birdId: string;
  alreadySeen: boolean;
  totalSightings: number;
};

export function MarkSeenForm({ birdId, alreadySeen, totalSightings }: Props) {
  const [state, action, isPending] = useActionState<State, FormData>(
    async () => markAsSeen(birdId),
    {},
  );

  const seen = alreadySeen || state.ok;
  const count = totalSightings + (state.ok ? 1 : 0);

  return (
    <form action={action} className="flex flex-col gap-3">
      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="w-full sm:w-auto sm:px-8"
      >
        {isPending
          ? "Logging…"
          : seen
            ? `✓ Seen — log another?`
            : "Mark as seen"}
      </Button>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {seen ? (
        <p className="text-xs text-brown/60">
          You&apos;ve logged this bird {count}× — every &ldquo;Mark as seen&rdquo;
          adds another sighting.
        </p>
      ) : null}
    </form>
  );
}
