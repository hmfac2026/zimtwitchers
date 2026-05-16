"use client";

import { useActionState, useId, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { markAsSeen } from "./actions";

type State = { error?: string; ok?: boolean };

type Props = {
  birdId: string;
  userId: string;
  totalSightings: number;
};

const PHOTO_BUCKET = "sighting-photos";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

export function MarkSeenForm({ birdId, userId, totalSightings }: Props) {
  const [state, action, isPending] = useActionState<State, FormData>(
    async (prev, formData) => {
      const photo = formData.get("photo");
      const photoFile =
        photo instanceof File && photo.size > 0 ? photo : null;

      let photoExt: string | null = null;
      const sightingId = crypto.randomUUID();

      if (photoFile) {
        if (photoFile.size > MAX_PHOTO_BYTES) {
          return { error: "Photo is over 10MB — try a smaller one." };
        }
        if (photoFile.type && !ALLOWED_MIME.has(photoFile.type)) {
          return { error: "Photo must be JPEG, PNG, WebP, or HEIC." };
        }
        const ext =
          filenameExt(photoFile.name) ?? mimeExt(photoFile.type) ?? "jpg";
        if (!ALLOWED_EXTS.has(ext)) {
          return { error: "Photo must be JPEG, PNG, WebP, or HEIC." };
        }

        const supabase = createClient();
        const path = `${userId}/${sightingId}/0.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, photoFile, {
            contentType: photoFile.type || "application/octet-stream",
            upsert: true,
          });
        if (upErr) {
          return { error: `Photo upload failed: ${upErr.message}` };
        }
        photoExt = ext;
      }

      const actionData = new FormData();
      actionData.set("birdId", birdId);
      actionData.set("sightingId", sightingId);
      if (photoExt) actionData.set("photoExt", photoExt);
      for (const key of ["count", "notes", "observed_at"]) {
        const v = formData.get(key);
        if (v != null) actionData.set(key, String(v));
      }

      return markAsSeen(prev, actionData);
    },
    {},
  );
  const [expanded, setExpanded] = useState(false);
  const photoInputId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const just = state.ok && !isPending;

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-4"
      key={state.ok ? "logged" : "logging"}
    >
      {!expanded ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" disabled={isPending} className="sm:px-8">
            {isPending ? "Logging…" : "Mark as seen"}
          </Button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-sm font-medium text-forest underline-offset-2 hover:underline"
          >
            Add notes, photo, or count
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl bg-cream/40 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="observed_at">When</Label>
              <Input
                id="observed_at"
                name="observed_at"
                type="datetime-local"
                defaultValue={defaultLocalDatetime()}
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="count">How many</Label>
              <Input
                id="count"
                name="count"
                type="number"
                min={1}
                max={9999}
                defaultValue={1}
                className="h-10"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={1000}
              placeholder="Where you spotted it, behaviour, anything memorable…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={photoInputId}>Photo (optional)</Label>
            <Input
              id={photoInputId}
              name="photo"
              type="file"
              accept="image/*"
              className="h-auto py-2"
            />
            <p className="text-xs text-brown/55">
              Up to 10MB — JPEG, PNG, WebP, or HEIC.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-sm font-medium text-brown/65 hover:text-brown"
            >
              Cancel
            </button>
            <Button type="submit" size="lg" disabled={isPending} className="sm:px-8">
              {isPending ? "Logging…" : "Log sighting"}
            </Button>
          </div>
        </div>
      )}

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {just ? (
        <p className="text-sm text-forest">
          ✓ Sighting logged. You&apos;ve seen this bird {totalSightings + 1}× total.
        </p>
      ) : totalSightings > 0 ? (
        <p className="text-xs text-brown/60">
          Already logged {totalSightings}× — every &ldquo;Mark as seen&rdquo; adds another.
        </p>
      ) : null}
    </form>
  );
}

function defaultLocalDatetime(): string {
  // <input type="datetime-local"> wants YYYY-MM-DDTHH:mm in *local* time.
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function filenameExt(name: string): string | null {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return null;
  const ext = name.slice(idx + 1).toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : null;
}

function mimeExt(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return null;
  }
}
