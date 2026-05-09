"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createGroup, joinGroup } from "./actions";

type ActionResult = { error: string } | undefined;
type OnboardingAction = (
  state: ActionResult,
  formData: FormData,
) => Promise<ActionResult>;

type OnboardingFormProps = {
  defaultDisplayName?: string;
};

function CreateForm({ defaultDisplayName }: { defaultDisplayName?: string }) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    createGroup as OnboardingAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="group_name">Flock name</Label>
        <Input
          id="group_name"
          name="group_name"
          required
          maxLength={60}
          placeholder="e.g. Toronto Twitchers"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name_create">Your display name</Label>
        <Input
          id="display_name_create"
          name="display_name"
          required
          maxLength={40}
          defaultValue={defaultDisplayName}
          placeholder="What your friends should see"
        />
      </div>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create flock"}
      </Button>
    </form>
  );
}

function JoinForm({ defaultDisplayName }: { defaultDisplayName?: string }) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    joinGroup as OnboardingAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite_code">Invite code</Label>
        <Input
          id="invite_code"
          name="invite_code"
          required
          maxLength={16}
          placeholder="From your friend"
          autoComplete="off"
          className="uppercase tracking-widest"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name_join">Your display name</Label>
        <Input
          id="display_name_join"
          name="display_name"
          required
          maxLength={40}
          defaultValue={defaultDisplayName}
          placeholder="What your friends should see"
        />
      </div>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Joining…" : "Join flock"}
      </Button>
    </form>
  );
}

export function OnboardingForms({ defaultDisplayName }: OnboardingFormProps) {
  return (
    <Tabs defaultValue="create">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="create">Start a flock</TabsTrigger>
        <TabsTrigger value="join">Join a flock</TabsTrigger>
      </TabsList>
      <TabsContent value="create" className="pt-4">
        <CreateForm defaultDisplayName={defaultDisplayName} />
      </TabsContent>
      <TabsContent value="join" className="pt-4">
        <JoinForm defaultDisplayName={defaultDisplayName} />
      </TabsContent>
    </Tabs>
  );
}
