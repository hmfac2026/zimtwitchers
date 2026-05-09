import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "../../birds/AppHeader";
import { LifeList } from "../../me/LifeList";

type Props = {
  params: Promise<{ user_id: string }>;
};

export default async function FriendLifeListPage({ params }: Props) {
  const { user_id: friendUserId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: viewerMembership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!viewerMembership) redirect("/onboarding");

  // Same person → redirect to /me for the canonical URL.
  if (friendUserId === user.id) redirect("/me");

  // Friend must be a member of the same group (RLS enforces this too, but
  // we want a clean 404 rather than an empty-list page).
  const { data: friend } = await supabase
    .from("group_members")
    .select("display_name, user_id, group_id")
    .eq("user_id", friendUserId)
    .eq("group_id", viewerMembership.group_id)
    .maybeSingle();

  if (!friend) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="me" />
      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <Link
            href="/home"
            className="inline-flex items-center text-sm text-brown/65 hover:text-brown"
          >
            ← Back to flock
          </Link>
          <LifeList
            userId={friend.user_id}
            displayName={friend.display_name}
            isSelf={false}
            groupId={friend.group_id}
          />
        </div>
      </main>
    </div>
  );
}
