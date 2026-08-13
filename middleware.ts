import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

function hasAdminSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(
    (cookie) => cookie.value && cookie.name.includes("better-auth.session_token"),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isAdminApp = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  if (isAdminApp && !hasAdminSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    try {
      return await updateSession(request);
    } catch {
      return NextResponse.next();
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
