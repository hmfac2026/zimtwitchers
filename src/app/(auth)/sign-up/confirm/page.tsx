import { AuthShell } from "../../AuthShell";

export default function ConfirmPage() {
  return (
    <AuthShell
      title="Check your email"
      description="We sent you a confirmation link. Click it to finish creating your account."
    >
      <p className="text-sm text-muted-foreground">
        Once you confirm, you&apos;ll come back here to either start a new flock or
        join one with an invite code.
      </p>
    </AuthShell>
  );
}
