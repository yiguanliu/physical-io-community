import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { ADMIN_ROLE, canAccessAdmin, isAdminRole } from "@/lib/auth/allowlist";
import { readyDb } from "@/lib/db/client";
import { user } from "@/lib/db/schema";

export async function getAdminSession() {
  await readyDb();
  return auth.api.getSession({ headers: await headers() });
}

export function sessionRole(session: Awaited<ReturnType<typeof getAdminSession>>) {
  return (session?.user as { role?: string } | undefined)?.role;
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
  const role = sessionRole(session);
  if (!canAccessAdmin(session.user.email, role)) redirect("/admin/login?status=pending");
  if (!isAdminRole(role)) {
    try {
      const db = await readyDb();
      await db.update(user).set({ role: ADMIN_ROLE, updatedAt: new Date() }).where(eq(user.id, session.user.id));
    } catch {
      // Cookie-cached sessions can land on an empty Vercel SQLite file; access still proceeds.
    }
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
