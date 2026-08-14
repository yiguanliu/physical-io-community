import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { ADMIN_ROLE, canAccessAdmin, isAdminRole } from "@/lib/auth/allowlist";
import { ensureAdminProfile } from "@/lib/auth/profiles";
import { readyDb } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { createClient } from "@/utils/supabase/server";

export async function getAdminSession() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const profile = await ensureAdminProfile(data.user);
  return profile ? { user: profile } : null;
}

export function sessionRole(session: Awaited<ReturnType<typeof getAdminSession>>) {
  return session?.user.role;
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
  const role = sessionRole(session);
  if (!canAccessAdmin(session.user.email, role)) redirect("/admin/login?status=pending");
  if (!isAdminRole(role)) {
    const db = await readyDb();
    await db.update(user).set({ role: ADMIN_ROLE, updatedAt: new Date() }).where(eq(user.id, session.user.id));
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: ADMIN_ROLE,
  };
}

export async function hasAdminUsers() {
  const db = await readyDb();
  const [{ total }] = await db.select({ total: count() }).from(user).where(eq(user.role, ADMIN_ROLE));
  return Number(total) > 0;
}
