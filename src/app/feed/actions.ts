"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_EMOJIS = new Set(["👍", "🦅", "🔥"]);

type ToggleResult = { ok?: boolean; error?: string };

export async function toggleReaction(
  sightingId: string,
  emoji: string,
): Promise<ToggleResult> {
  if (!sightingId) return { error: "Missing sighting." };
  if (!ALLOWED_EMOJIS.has(emoji)) return { error: "Unsupported reaction." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to react." };

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("sighting_id", sightingId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("reactions").delete().eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("reactions").insert({
      sighting_id: sightingId,
      user_id: user.id,
      emoji,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/feed");
  return { ok: true };
}
