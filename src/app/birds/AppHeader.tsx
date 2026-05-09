import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  active?: "home" | "feed" | "leaderboard" | "catalog" | "me";
};

const NAV: { id: NonNullable<AppHeaderProps["active"]>; href: string; label: string }[] = [
  { id: "home",        href: "/home",        label: "Home" },
  { id: "feed",        href: "/feed",        label: "Feed" },
  { id: "leaderboard", href: "/leaderboard", label: "Leaderboard" },
  { id: "catalog",     href: "/birds",       label: "Birds" },
  { id: "me",          href: "/me",          label: "Me" },
];

export function AppHeader({ active = "home" }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-brown/10 bg-bone/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <Link href="/home" className="inline-flex shrink-0" aria-label="Zim Twitchers home">
          <Logo size="sm" />
        </Link>
        <nav
          aria-label="Primary"
          className="-mx-2 flex flex-1 items-center justify-end gap-0.5 overflow-x-auto px-2 sm:gap-2"
        >
          {NAV.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-3",
                active === n.id ? "text-forest" : "text-brown/70 hover:text-brown",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <form action="/auth/sign-out" method="post" className="shrink-0">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-brown/25 text-brown hover:bg-cream/50"
          >
            Out
          </Button>
        </form>
      </div>
    </header>
  );
}
