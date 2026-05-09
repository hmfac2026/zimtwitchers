"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PHOTO_BUCKET = "sighting-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type ActionResult = { error?: string; ok?: boolean };

export async function markAsSeen(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const birdId = String(formData.get("birdId") ?? "");
  if (!birdId) return { error: "Missing bird id." };

  const rawCount = formData.get("count");
  const rawNotes = formData.get("notes");
  const rawObservedAt = formData.get("observed_at");
  const photoEntry = formData.get("photo");

  let count = 1;
  if (rawCount && String(rawCount).trim() !== "") {
    const n = parseInt(String(rawCount), 10);
    if (Number.isNaN(n) || n < 1) {
      return { error: "Count must be 1 or more." };
    }
    count = Math.min(n, 9999);
  }

  const notes =
    rawNotes && String(rawNotes).trim() !== ""
      ? String(rawNotes).trim().slice(0, 1000)
      : null;

  let observedAt: string | undefined;
  if (rawObservedAt && String(rawObservedAt).trim() !== "") {
    const d = new Date(String(rawObservedAt));
    if (Number.isNaN(d.getTime())) {
      return { error: "Couldn't read that observation date." };
    }
    observedAt = d.toISOString();
  }

  // Validate photo if provided
  let photoFile: File | null = null;
  if (photoEntry && photoEntry instanceof File && photoEntry.size > 0) {
    if (photoEntry.size > MAX_PHOTO_BYTES) {
      return { error: "Photo is over 5MB — try a smaller one." };
    }
    if (photoEntry.type && !ALLOWED_MIME.has(photoEntry.type)) {
      return { error: "Photo must be JPEG, PNG, WebP, or HEIC." };
    }
    photoFile = photoEntry;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "Join a group first." };

  // Insert sighting first (without photo) so we have its UUID for the path.
  const { data: inserted, error: insertErr } = await supabase
    .from("sightings")
    .insert({
      user_id: user.id,
      group_id: membership.group_id,
      bird_id: birdId,
      count,
      notes,
      ...(observedAt ? { observed_at: observedAt } : {}),
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { error: insertErr?.message ?? "Could not log sighting." };
  }

  if (photoFile) {
    const ext = filenameExt(photoFile.name) ?? mimeExt(photoFile.type) ?? "jpg";
    const path = `${user.id}/${inserted.id}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, photoFile, {
        contentType: photoFile.type || "application/octet-stream",
        upsert: true,
      });

    if (upErr) {
      // Sighting is logged; photo failed — surface a soft warning but keep
      // the sighting (caller can re-upload later if we add edit UI).
      return {
        error: `Sighting saved, but photo upload failed: ${upErr.message}`,
      };
    }

    const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    if (pub?.publicUrl) {
      await supabase
        .from("sightings")
        .update({ photo_url: pub.publicUrl })
        .eq("id", inserted.id);
    }
  }

  revalidatePath("/birds");
  revalidatePath(`/birds/${birdId}`);
  revalidatePath("/me");
  return { ok: true };
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
