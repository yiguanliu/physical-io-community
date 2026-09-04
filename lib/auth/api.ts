import { NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/auth/allowlist";
import { hasSupabaseAdminEnv } from "@/lib/auth/guards";
import { getAdminSession, sessionRole } from "@/lib/auth/session";

export async function requireAdminApi() {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ error: "Admin is not configured." }, { status: 503 });
  }

  const session = await getAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canAccessAdmin(session.user.email, sessionRole(session))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return null;
}
