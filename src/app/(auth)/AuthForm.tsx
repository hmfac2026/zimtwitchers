"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ActionResult = { error: string } | undefined;
type AuthAction = (
  state: ActionResult,
  formData: FormData,
) => Promise<ActionResult>;

type AuthFormProps = {
  action: AuthAction;
  submitLabel: string;
  pendingLabel?: string;
  next?: string;
  passwordHint?: string;
};

export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  next,
  passwordHint,
}: AuthFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={submitLabel.toLowerCase().includes("up") ? "new-password" : "current-password"}
        />
        {passwordHint ? (
          <p className="text-xs text-muted-foreground">{passwordHint}</p>
        ) : null}
      </div>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? (pendingLabel ?? `${submitLabel}…`) : submitLabel}
      </Button>
    </form>
  );
}
