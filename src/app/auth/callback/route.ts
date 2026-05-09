import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/onboarding";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const back = new URL("/sign-in", url);
    back.searchParams.set("error", error.message);
    return NextResponse.redirect(back);
  }

  return NextResponse.redirect(new URL(next, url));
}
