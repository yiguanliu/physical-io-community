export const EPHEMERAL_ACCOUNT_ERROR =
  "The admin workspace is missing SUPABASE_SECRET_KEY, so it cannot persist administrator roles.";

type SupabaseAdminEnv = Record<string, string | undefined>;

export function hasSupabaseAdminEnv(env: SupabaseAdminEnv = process.env) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim() && (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));
}

export function assertAccountsPersist(env: SupabaseAdminEnv = process.env) {
  if (!hasSupabaseAdminEnv(env)) {
    throw new Error(EPHEMERAL_ACCOUNT_ERROR);
  }
}
