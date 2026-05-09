import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on every request except Next.js internals, static assets, the
    // service worker, and the web manifest (those need to be reachable
    // without a session — the proxy would otherwise 307 them to /sign-in).
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|js|json|webmanifest)$).*)",
  ],
};
