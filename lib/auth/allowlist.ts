/** Emails that may always create an administrator account. */
export const FOUNDING_ADMINS = ["soul@physical-io.com"];

export const ADMIN_ROLE = "admin";
export const PENDING_ROLE = "pending";

export function adminAllowlist(envValue = process.env.ADMIN_ALLOWLIST) {
  const extra = (envValue ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...FOUNDING_ADMINS, ...extra])];
}

export function isAdminRole(role?: string | null) {
  return role === ADMIN_ROLE;
}

export function isAllowlistedAdmin(email: string, envValue?: string) {
  return adminAllowlist(envValue).includes(email.trim().toLowerCase());
}

export function canAccessAdmin(email: string, role?: string | null, envValue?: string) {
  return isAdminRole(role) || isAllowlistedAdmin(email, envValue);
}

/** First administrator, or an allowlisted email, is granted admin on signup. Everyone else is pending. */
export function canCreateAdmin(email: string, existingAdminCount: number, envValue?: string) {
  if (existingAdminCount <= 0) return true;
  return adminAllowlist(envValue).includes(email.trim().toLowerCase());
}

export function roleForNewUser(email: string, existingAdminCount: number, envValue?: string) {
  return canCreateAdmin(email, existingAdminCount, envValue) ? ADMIN_ROLE : PENDING_ROLE;
}
