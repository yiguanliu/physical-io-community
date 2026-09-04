import type { User as SupabaseUser } from "@supabase/supabase-js";
import { ADMIN_ROLE, roleForNewUser } from "@/lib/auth/allowlist";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

type ProfileInput = {
  name?: string;
  email?: string;
};

export type AdminProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
};

function metadataName(authUser: SupabaseUser) {
  const metadata = authUser.user_metadata;
  return (
    (typeof metadata?.name === "string" && metadata.name.trim()) ||
    (typeof metadata?.full_name === "string" && metadata.full_name.trim()) ||
    ""
  );
}

function fallbackName(email: string) {
  return email.split("@")[0] || "Administrator";
}

export function adminRoleForUser(authUser: Pick<SupabaseUser, "app_metadata" | "user_metadata">) {
  const fromApp = authUser.app_metadata?.admin_role;
  const fromUser = authUser.user_metadata?.admin_role || authUser.user_metadata?.role;
  return typeof fromApp === "string" ? fromApp : typeof fromUser === "string" ? fromUser : undefined;
}

export function profileFromAuthUser(authUser: SupabaseUser): AdminProfile | null {
  const email = authUser.email?.trim().toLowerCase();
  if (!email) return null;
  return {
    id: authUser.id,
    name: metadataName(authUser) || fallbackName(email),
    email,
    role: adminRoleForUser(authUser) ?? "pending",
    createdAt: authUser.created_at,
  };
}

async function adminCount() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.filter((user) => adminRoleForUser(user) === ADMIN_ROLE).length;
}

export async function ensureAdminProfile(
  authUser: SupabaseUser,
  input: ProfileInput = {},
): Promise<AdminProfile | null> {
  const email = (input.email || authUser.email || "").trim().toLowerCase();
  if (!email) return null;

  const name = (input.name || metadataName(authUser) || fallbackName(email)).trim();
  const existingRole = adminRoleForUser(authUser);
  const role = existingRole ?? roleForNewUser(email, await adminCount());
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
    app_metadata: {
      ...authUser.app_metadata,
      admin_role: role,
    },
    user_metadata: {
      ...authUser.user_metadata,
      name,
    },
  });
  if (error) throw error;
  return profileFromAuthUser(data.user);
}

export async function setAdminRole(userId: string, role: string) {
  const supabase = getSupabaseAdminClient();
  const { data: userResult, error: getError } = await supabase.auth.admin.getUserById(userId);
  if (getError) throw getError;
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    ...(role === ADMIN_ROLE ? { email_confirm: true } : {}),
    app_metadata: {
      ...userResult.user.app_metadata,
      admin_role: role,
    },
  });
  if (error) throw error;
  return profileFromAuthUser(data.user);
}

export async function listAdminProfiles() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users
    .map(profileFromAuthUser)
    .filter((profile): profile is AdminProfile => Boolean(profile))
    .sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")));
}
