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
