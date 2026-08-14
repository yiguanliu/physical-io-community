import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh the auth token. Must run immediately after creating the client.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isOutreachApi = pathname.startsWith("/api/outreach");
  const isOutreachPage = pathname === "/outreach" || pathname.startsWith("/outreach/");
  const isOutreachAuth =
    pathname === "/outreach/login" || pathname.startsWith("/outreach/auth/");
  const hasOutreachAccess = user?.app_metadata?.outreach_access === true;

  if (isOutreachApi && !hasOutreachAccess) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (isOutreachPage && !isOutreachAuth && !hasOutreachAccess) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/outreach/login";
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (pathname === "/outreach/login" && hasOutreachAccess) {
    const outreachUrl = request.nextUrl.clone();
    outreachUrl.pathname = "/outreach";
    outreachUrl.search = "";
    const redirectResponse = NextResponse.redirect(outreachUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return supabaseResponse;
};
