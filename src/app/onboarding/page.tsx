import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForms } from "./OnboardingForms";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const defaultDisplayName = user.email?.split("@")[0];

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-10 inline-flex" aria-label="Zim Twitchers home">
        <Logo size="md" />
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Find your flock</CardTitle>
          <CardDescription>
            Start a new birding group with friends, or join one with an invite code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForms defaultDisplayName={defaultDisplayName} />
        </CardContent>
      </Card>
    </main>
  );
}
