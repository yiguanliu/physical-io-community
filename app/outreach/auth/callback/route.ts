import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const destination = new URL("/outreach", requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(new URL("/outreach/login?error=missing_code", requestUrl.origin));
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/outreach/login?error=invalid_link", requestUrl.origin));
  }

  return NextResponse.redirect(destination);
}
