"use server";

import { cookies } from "next/headers";
import { assertAccountsPersist } from "@/lib/auth/guards";
import { canAccessAdmin } from "@/lib/auth/allowlist";
import { ensureAdminProfile } from "@/lib/auth/profiles";
import { createClient } from "@/utils/supabase/server";

export type AdminAuthActionResult =
  | { ok: true; pending?: boolean; confirmationRequired?: boolean }
  | { ok: false; error: string };

function authErrorMessage(message?: string) {
  if (!message) return "Authentication failed.";
  if (/invalid login credentials/i.test(message)) return "Email or password is incorrect.";
  return message;
}

export async function signInAdminAction(formData: FormData): Promise<AdminAuthActionResult> {
  let supabase: ReturnType<typeof createClient> | null = null;
  try {
    assertAccountsPersist();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    supabase = createClient(await cookies());
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { ok: false, error: authErrorMessage(error?.message) };

    const profile = await ensureAdminProfile(data.user, { email });
    if (!profile) {
      await supabase.auth.signOut();
      return { ok: false, error: "Could not resolve your administrator profile." };
    }
    if (!canAccessAdmin(profile.email, profile.role)) {
      return { ok: true, pending: true };
    }
    return { ok: true };
  } catch (error) {
    await supabase?.auth.signOut().catch(() => undefined);
    return { ok: false, error: authErrorMessage(error instanceof Error ? error.message : undefined) };
  }
}

export async function requestAdminAccessAction(formData: FormData): Promise<AdminAuthActionResult> {
  let supabase: ReturnType<typeof createClient> | null = null;
  try {
    assertAccountsPersist();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim() || "Administrator";
    supabase = createClient(await cookies());
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    if (error || !data.user) return { ok: false, error: authErrorMessage(error?.message) };

    const profile = await ensureAdminProfile(data.user, { email, name });
    if (!profile) {
      await supabase.auth.signOut();
      return { ok: false, error: "Could not create your administrator profile." };
    }
    if (!canAccessAdmin(profile.email, profile.role)) {
      await supabase.auth.signOut();
      return { ok: true, pending: true, confirmationRequired: !data.session };
    }
    return { ok: true, confirmationRequired: !data.session };
  } catch (error) {
    await supabase?.auth.signOut().catch(() => undefined);
    return { ok: false, error: authErrorMessage(error instanceof Error ? error.message : undefined) };
  }
}

export async function signOutAdminAction() {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
}
