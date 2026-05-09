"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok?: boolean; error?: string };

/**
 * Permanently delete a user and everything they own (group_members,
 * sightings, reactions cascade). Only the flock's creator
 * (groups.created_by) can do this. Self-removal is refused.
 */
export async function removeMember(targetUserId: string): Promise<ActionResult> {
  if (!targetUserId) return { error: "Missing user id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // 1. Find caller's group + verify they're the creator.
  const { data: caller } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!caller) return { error: "Not in a group." };

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", caller.group_id)
    .maybeSingle();

  if (!group || group.created_by !== user.id) {
    return { error: "Only the flock creator can remove members." };
  }

  if (targetUserId === user.id) {
    return { error: "You can't remove yourself." };
  }

  // 2. Verify target is in caller's flock (so we can't be tricked into
  //    removing someone in a different group).
  const { data: target } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("user_id", targetUserId)
    .eq("group_id", caller.group_id)
    .maybeSingle();
  if (!target) return { error: "That user isn't in your flock." };

  // 3. Delete the auth user via service-role admin client. FK cascades
  //    handle group_members, sightings, reactions, storage references.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(targetUserId);
  if (error) return { error: error.message };

  revalidatePath("/home");
  revalidatePath("/feed");
  revalidatePath("/leaderboard");
  return { ok: true };
}
