"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | undefined;

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "You need to be signed in.",
  already_in_group: "You're already in a group.",
  invalid_invite_code: "That invite code didn't match a group.",
};

function translateError(raw: string | undefined): string {
  if (!raw) return "Something went wrong.";
  return ERROR_MESSAGES[raw] ?? raw;
}

export async function createGroup(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const groupName = String(formData.get("group_name") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!groupName) return { error: "Pick a name for your flock." };
  if (!displayName) return { error: "Add a display name." };
  if (groupName.length > 60) return { error: "Group name is too long." };
  if (displayName.length > 40) return { error: "Display name is too long." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group_with_member", {
    p_group_name: groupName,
    p_display_name: displayName,
  });

  if (error) return { error: translateError(error.message) };

  redirect("/home");
}

export async function joinGroup(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const inviteCode = String(formData.get("invite_code") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!inviteCode) return { error: "Enter your invite code." };
  if (!displayName) return { error: "Add a display name." };
  if (displayName.length > 40) return { error: "Display name is too long." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_group_by_code", {
    p_invite_code: inviteCode,
    p_display_name: displayName,
  });

  if (error) return { error: translateError(error.message) };

  redirect("/home");
}
