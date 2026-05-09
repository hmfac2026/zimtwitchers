import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/auth/callback"];

const ONBOARDING_PATH = "/onboarding";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Touch the session so cookies refresh on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // Onboarding gate: signed-in users without a group are forced to /onboarding
  // (except for /onboarding itself and the auth callback / sign-out routes).
  if (user && pathname !== ONBOARDING_PATH && !pathname.startsWith("/auth/")) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership && pathname !== "/") {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      return NextResponse.redirect(url);
    }

    if (membership && pathname === ONBOARDING_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
