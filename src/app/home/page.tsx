import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Signed in as
            </span>
            <span className="text-base font-medium">{membership.display_name}</span>
          </div>
          <form action="/auth/sign-out" method="post">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </header>

        <section className="flex flex-col gap-2 text-center">
          <span aria-hidden className="text-4xl">
            🦜
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome, {membership.display_name}
          </h1>
          <p className="text-muted-foreground">
            You&apos;re in <strong>{group?.name}</strong>. Bird catalog coming next.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Invite code</CardTitle>
            <CardDescription>
              Share this with friends so they can join {group?.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block w-full rounded-md bg-muted px-4 py-3 text-center text-2xl font-mono tracking-[0.3em]">
              {group?.invite_code}
            </code>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
