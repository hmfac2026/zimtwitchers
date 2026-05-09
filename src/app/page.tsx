import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex max-w-md flex-col items-center gap-6">
        <span aria-hidden className="text-5xl" role="img">
          🦜
        </span>
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Zim Twitchers
          </h1>
          <p className="text-lg text-muted-foreground">
            Spot it. Log it. Climb the flock.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Coming soon — a private birdwatching app for you and your friends.
        </p>
        <Button size="lg" className="mt-2" disabled>
          Sign in
        </Button>
      </div>
    </main>
  );
}
