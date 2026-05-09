"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeMember } from "./admin-actions";

type Props = {
  userId: string;
  displayName: string;
};

export function RemoveMemberButton({ userId, displayName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    const ok = window.confirm(
      `Permanently remove ${displayName} from this flock?\n\n` +
        `This deletes their account, all their sightings, photos, and reactions. ` +
        `This can't be undone.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await removeMember(userId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={isPending}
        className="border-pitta-red/40 text-pitta-red hover:bg-pitta-red/10"
        aria-label={`Remove ${displayName}`}
      >
        {isPending ? "Removing…" : "Remove"}
      </Button>
      {error ? (
        <span className="text-[0.7rem] text-pitta-red">{error}</span>
      ) : null}
    </span>
  );
}
