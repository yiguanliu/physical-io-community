import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export function memberAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

// Community library access is for verified, non-anonymous accounts; admin roles are unrelated.
export async function getMember() {
  if (!memberAuthConfigured()) return null;
  try {
    const { data, error } = await createClient(await cookies()).auth.getUser();
    return !error && data.user?.email_confirmed_at && !data.user.is_anonymous ? data.user : null;
  } catch { return null; }
}

export async function requireMember() {
  const member = await getMember();
  if (!member) redirect('/login');
  return member;
}
