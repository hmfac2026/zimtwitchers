"use client";

import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteSighting, updateSightingCount } from "./actions";

type Sighting = {
  id: string;
  observed_at: string;
  count: number;
  photos: string[] | null;
};

type Props = {
  sightings: Sighting[];
};

export function YourSightings({ sightings }: Props) {
  if (sightings.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="!text-lg">
        Your sightings ({sightings.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {sightings.map((s) => (
          <SightingRow key={s.id} sighting={s} />
        ))}
      </ul>
    </section>
  );
}

function SightingRow({ sighting }: { sighting: Sighting }) {
  const [editing, setEditing] = useState(false);
  const [count, setCount] = useState(sighting.count);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const thumb =
    sighting.photos && sighting.photos.length > 0 ? sighting.photos[0] : null;

  function save() {
    setError(null);
    if (!Number.isInteger(count) || count < 1) {
      setError("Count must be 1 or more.");
      return;
    }
    startTransition(async () => {
      const result = await updateSightingCount(sighting.id, count);
      if (result.error) setError(result.error);
      else setEditing(false);
    });
  }

  function cancel() {
    setEditing(false);
    setCount(sighting.count);
    setError(null);
  }

  function del() {
    const ok = window.confirm("Delete this sighting? This can't be undone.");
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSighting(sighting.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-cream/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              width="40"
              height="40"
              className="block h-10 w-10 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-cream/60 text-base text-brown/35">
              🪶
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-brown">
              {formatDate(sighting.observed_at)}
            </span>
            {!editing ? (
              <span className="text-xs text-brown/65">
                {sighting.count} bird{sighting.count === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
        {!editing ? (
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={isPending}
              className="text-xs font-medium text-forest underline-offset-2 hover:underline disabled:opacity-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={del}
              disabled={isPending}
              className="text-xs font-medium text-pitta-red underline-offset-2 hover:underline disabled:opacity-50"
            >
              {isPending ? "…" : "Delete"}
            </button>
          </div>
        ) : null}
      </div>
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-brown/65" htmlFor={`count-${sighting.id}`}>
            How many
          </label>
          <Input
            id={`count-${sighting.id}`}
            type="number"
            min={1}
            max={9999}
            value={count}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setCount(Number.isNaN(n) ? 0 : n);
            }}
            className="h-9 w-20"
          />
          <Button type="button" size="sm" onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
          <button
            type="button"
            onClick={cancel}
            disabled={isPending}
            className="text-xs font-medium text-brown/65 hover:text-brown disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
