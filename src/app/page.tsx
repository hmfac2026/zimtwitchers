import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex max-w-md flex-col items-center gap-8">
        <Logo size="lg" iconOnly />

        <div className="flex flex-col items-center gap-4">
          <h1>Zim Twitchers</h1>
          <p className="font-serif text-xl italic text-brown/70">
            Spot it. Log it. Climb the flock.
          </p>
        </div>

        <p className="max-w-sm text-base text-brown/75">
          A private birdwatching app for you and your friends.
        </p>

        <div className="mt-2 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row">
          <Link href="/sign-in" className={cn(buttonVariants({ size: "lg" }), "px-6")}>
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "border-brown/25 text-brown hover:bg-cream/50 px-6",
            )}
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
