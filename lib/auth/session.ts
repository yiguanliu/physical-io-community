import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ROLE, canAccessAdmin, isAdminRole } from "@/lib/auth/allowlist";
import { ensureAdminProfile, setAdminRole } from "@/lib/auth/profiles";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

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
  if (!isAdminRole(role)) await setAdminRole(session.user.id, ADMIN_ROLE);
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: ADMIN_ROLE,
  };
}

export async function hasAdminUsers() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.some((user) => user.app_metadata?.admin_role === ADMIN_ROLE);
}
