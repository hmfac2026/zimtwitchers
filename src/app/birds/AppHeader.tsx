import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

type AppHeaderProps = {
  active?: "catalog" | "home";
};

export function AppHeader({ active = "catalog" }: AppHeaderProps) {
  return (
    <header className="border-b border-brown/10 bg-bone/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link href="/home" className="inline-flex" aria-label="Zim Twitchers home">
          <Logo size="sm" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/home"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active === "home" ? "text-forest" : "text-brown/70 hover:text-brown"
            }`}
          >
            Home
          </Link>
          <Link
            href="/birds"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active === "catalog" ? "text-forest" : "text-brown/70 hover:text-brown"
            }`}
          >
            Catalog
          </Link>
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
        </nav>
      </div>
    </header>
  );
}
