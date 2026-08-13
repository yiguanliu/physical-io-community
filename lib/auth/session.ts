import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { readyDb } from "@/lib/db/client";

export async function getAdminSession() {
  await readyDb();
  return auth.api.getSession({ headers: await headers() });
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: (session.user as { role?: string }).role ?? "admin",
  };
}

export async function hasAdminUsers() {
  const { count } = await import("drizzle-orm");
  const { user } = await import("@/lib/db/schema");
  const db = await readyDb();
  const [{ total }] = await db.select({ total: count() }).from(user);
  return Number(total) > 0;
}
