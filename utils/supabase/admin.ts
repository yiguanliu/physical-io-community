import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseAdminClient = SupabaseClient<any, any, any>;

type GlobalSupabase = {
  adminSupabase?: SupabaseAdminClient;
};

const globalForSupabase = globalThis as unknown as GlobalSupabase;

export function getSupabaseAdminClient() {
  if (!globalForSupabase.adminSupabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY to use the admin workspace.");
    }

    globalForSupabase.adminSupabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }) as SupabaseAdminClient;
  }

  return globalForSupabase.adminSupabase;
}

export function requireSupabaseAdminEnv() {
  getSupabaseAdminClient();
}
