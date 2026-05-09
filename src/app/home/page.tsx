import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/Logo";
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
    <div className="flex flex-1 flex-col">
      <header className="border-b border-brown/10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <Logo size="sm" />
          <form action="/auth/sign-out" method="post">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-brown/25 text-brown hover:bg-cream/50"
            >
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-10 sm:py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
          <section className="flex flex-col items-center gap-3 text-center">
            <h1>Welcome, {membership.display_name}</h1>
            <p className="text-base text-brown/75">
              You&apos;re flocking with <strong className="text-forest">{group?.name}</strong>.
              The bird catalog is coming next.
            </p>
          </section>

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
