import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "../birds/AppHeader";
import { LifeList } from "./LifeList";

export default async function MyLifeListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="me" />
      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <LifeList
            userId={user.id}
            displayName={membership.display_name}
            isSelf
            groupId={membership.group_id}
          />
        </div>
      </main>
    </div>
  );
}
