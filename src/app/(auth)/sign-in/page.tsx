import Link from "next/link";
import { signIn } from "../actions";
import { AuthForm } from "../AuthForm";
import { AuthShell } from "../AuthShell";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <AuthShell
      title="Sign in"
      description="Welcome back, twitcher."
      footer={
        <p className="text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/sign-up" className="font-medium underline underline-offset-2">
            Create an account
          </Link>
        </p>
      }
    >
      <AuthForm action={signIn} submitLabel="Sign in" next={next} />
    </AuthShell>
  );
}
