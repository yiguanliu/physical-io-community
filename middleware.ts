import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

function hasAdminSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(
    (cookie) => cookie.value && cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminApp = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
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
      return NextResponse.next();
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
