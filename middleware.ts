import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

function hasAdminSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(
    (cookie) => cookie.value && cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Sign-in, invitation/reset links and their landing page must open without a session cookie:
  // invitation emails carry the session in the URL fragment, which the server cannot see.
  const isAdminPublic = ["/admin/login", "/admin/reset-password", "/admin/auth/"].some((path) => pathname.startsWith(path));
  const isAdminApp = pathname.startsWith("/admin") && !isAdminPublic;
  if (isAdminApp && !hasAdminSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    try {
      return await updateSession(request);
    } catch {
      if (pathname.startsWith("/api/outreach")) {
        return NextResponse.json({ error: "Authentication unavailable." }, { status: 503 });
      }
      if (pathname === "/outreach" || pathname.startsWith("/outreach/")) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("next", "/admin/outreach");
        url.searchParams.set("error", "authentication_unavailable");
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
