"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PHOTO_BUCKET = "sighting-photos";
const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ActionResult = { error?: string; ok?: boolean };

export async function markAsSeen(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const birdId = String(formData.get("birdId") ?? "");
  if (!birdId) return { error: "Missing bird id." };

  const sightingId = String(formData.get("sightingId") ?? "");
  if (!UUID_RE.test(sightingId)) return { error: "Bad sighting id." };

  const rawCount = formData.get("count");
  const rawNotes = formData.get("notes");
  const rawObservedAt = formData.get("observed_at");
  const rawPhotoExt = formData.get("photoExt");

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

  let photoExt: string | null = null;
  if (rawPhotoExt && String(rawPhotoExt).trim() !== "") {
    const ext = String(rawPhotoExt).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return { error: "Unsupported photo type." };
    }
    photoExt = ext;
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

  const photos: string[] = [];
  if (photoExt) {
    const path = `${user.id}/${sightingId}/0.${photoExt}`;
    const { data: pub } = supabase.storage
      .from(PHOTO_BUCKET)
      .getPublicUrl(path);
    if (pub?.publicUrl) photos.push(pub.publicUrl);
  }

  const { error: insertErr } = await supabase.from("sightings").insert({
    id: sightingId,
    user_id: user.id,
    group_id: membership.group_id,
    bird_id: birdId,
    count,
    notes,
    photos,
    ...(observedAt ? { observed_at: observedAt } : {}),
  });

  if (insertErr) {
    return { error: insertErr.message };
  }

  revalidatePath("/birds");
  revalidatePath(`/birds/${birdId}`);
  revalidatePath("/me");
  revalidatePath("/feed");
  return { ok: true };
}

export async function updateSightingCount(
  sightingId: string,
  count: number,
): Promise<ActionResult> {
  if (!UUID_RE.test(sightingId)) return { error: "Bad sighting id." };
  if (!Number.isInteger(count) || count < 1 || count > 9999) {
    return { error: "Count must be between 1 and 9999." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("sightings")
    .update({ count })
    .eq("id", sightingId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/birds", "layout");
  revalidatePath("/me");
  revalidatePath("/feed");
  return { ok: true };
}

export async function deleteSighting(
  sightingId: string,
): Promise<ActionResult> {
  if (!UUID_RE.test(sightingId)) return { error: "Bad sighting id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: existing } = await supabase
    .from("sightings")
    .select("photos")
    .eq("id", sightingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return { error: "Sighting not found." };

  const { error } = await supabase
    .from("sightings")
    .delete()
    .eq("id", sightingId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  const photoUrls = (existing.photos as string[] | null) ?? [];
  const photoPaths = photoUrls
    .map(extractStoragePath)
    .filter((p): p is string => p !== null);
  if (photoPaths.length > 0) {
    await supabase.storage.from(PHOTO_BUCKET).remove(photoPaths);
  }

  revalidatePath("/birds", "layout");
  revalidatePath("/me");
  revalidatePath("/feed");
  return { ok: true };
}

function extractStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/${PHOTO_BUCKET}/`;
    const i = url.pathname.indexOf(marker);
    return i >= 0 ? url.pathname.slice(i + marker.length) : null;
  } catch {
    return null;
  }
}
