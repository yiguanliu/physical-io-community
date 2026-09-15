import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { database } from '@/lib/admin/database';
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

// Profile presence is checked server-side; authentication alone is not membership.
export async function hasMemberProfile(email: string | undefined) {
  if (!email) return false;
  const result = await database().query('select id from public.members where email_normalized=$1 limit 1', [email.trim().toLowerCase()]);
  return Boolean(result.rows.length);
}

export async function requireMember() {
  const member = await getMember();
  if (!member) redirect('/login');
  if (!await hasMemberProfile(member.email)) redirect('/join?status=profile_required');
  return member;
}
