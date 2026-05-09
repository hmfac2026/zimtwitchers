import Link from "next/link";
import { signUp } from "../actions";
import { AuthForm } from "../AuthForm";
import { AuthShell } from "../AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create account"
      description="Then either start a new flock or join one with an invite code."
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium underline underline-offset-2">
            Sign in
          </Link>
        </p>
      }
    >
      <AuthForm
        action={signUp}
        submitLabel="Sign up"
        passwordHint="At least 8 characters."
      />
    </AuthShell>
  );
}
