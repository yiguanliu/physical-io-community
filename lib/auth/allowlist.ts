/** Emails that may always create an administrator account. */
export const FOUNDING_ADMINS = ["soul@physical-io.com"];

export function adminAllowlist(envValue = process.env.ADMIN_ALLOWLIST) {
  const extra = (envValue ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...FOUNDING_ADMINS, ...extra])];
}

export function canCreateAdmin(email: string, existingUserCount: number, envValue?: string) {
  if (existingUserCount <= 0) return true;
  return adminAllowlist(envValue).includes(email.trim().toLowerCase());
}
