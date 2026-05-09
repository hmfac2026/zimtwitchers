import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "../birds/AppHeader";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("group_members")
    .select("display_name, group_id, groups(name, invite_code)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const group = Array.isArray(membership.groups)
    ? membership.groups[0]
    : membership.groups;

  // sighting count for the user's life list teaser
  const { count: lifeListCount } = await supabase
    .from("sightings")
    .select("bird_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader active="home" />

      <main className="flex flex-1 flex-col px-4 py-10 sm:py-14">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
          <section className="flex flex-col items-center gap-3 text-center">
            <h1>Welcome, {membership.display_name}</h1>
            <p className="text-base text-brown/75">
              You&apos;re flocking with{" "}
              <strong className="text-forest">{group?.name}</strong>.
            </p>
          </section>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-xl">Browse the catalog</CardTitle>
                <CardDescription>
                  Search and filter the world&apos;s birds. Tap one to log it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/birds"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "w-full sm:w-auto sm:px-6",
                  )}
                >
                  Open catalog
                </Link>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-xl">Your sightings</CardTitle>
                <CardDescription>
                  {lifeListCount && lifeListCount > 0
                    ? `${lifeListCount} logged so far.`
                    : "Nothing logged yet."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-brown/55">
                  Life-list view ships in the next phase.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Invite code</CardTitle>
              <CardDescription>
                Share this with friends so they can join {group?.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block w-full rounded-md bg-cream/60 px-4 py-4 text-center font-mono text-2xl tracking-[0.3em] text-forest">
                {group?.invite_code}
              </code>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
