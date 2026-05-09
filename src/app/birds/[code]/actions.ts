"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; ok?: boolean };

export async function markAsSeen(birdId: string): Promise<ActionResult> {
  if (!birdId) return { error: "Missing bird id." };

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

  const { error } = await supabase.from("sightings").insert({
    user_id: user.id,
    group_id: membership.group_id,
    bird_id: birdId,
  });

  if (error) return { error: error.message };

  revalidatePath("/birds");
  return { ok: true };
}
