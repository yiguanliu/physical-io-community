'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { memberAuthConfigured, getMember } from '@/lib/auth/member';
import { memberAuthRedirect } from '@/lib/auth/member-redirect';

export type MemberAuthState = { error?: string; notice?: string };
export async function memberLogin(_previous: MemberAuthState, form: FormData): Promise<MemberAuthState> {
  if (!memberAuthConfigured()) return { error: 'Member login is temporarily unavailable. Please try again later.' };
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return { error: 'Enter your email and password.' };
  try {
    const { data, error } = await createClient(await cookies()).auth.signInWithPassword({ email, password });
    if (error || !data.user?.email_confirmed_at || data.user.is_anonymous) return { error: 'Unable to sign in. Check your email and password, and confirm your email first.' };
  } catch { return { error: 'Unable to connect. Please try again.' }; }
  redirect('/members');
}

export async function memberSignup(_previous: MemberAuthState, form: FormData): Promise<MemberAuthState> {
  if (!memberAuthConfigured()) return { error: 'Member registration is temporarily unavailable. Please try again later.' };
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || form.get('terms') !== 'on') return { error: 'Enter a valid email, a password of at least 8 characters, and accept the terms.' };
  try {
    const { data, error } = await createClient(await cookies()).auth.signUp({ email, password, options: { emailRedirectTo: memberAuthRedirect((await headers()).get('origin')) } });
    if (error) return { error: 'Unable to create an account. Try signing in if you already have one, or try again later.' };
    if (!data.session) return { notice: 'Check your email to confirm your account, then return here to sign in. If you already have an account, use Sign in.' };
  } catch { return { error: 'Unable to connect. Please try again.' }; }
  redirect('/members');
}

export async function memberSignOut() {
  const { error } = await createClient(await cookies()).auth.signOut();
  if (error) throw new Error('Could not sign out. Please try again.');
  redirect('/login');
}

export async function memberRecovery(_previous: MemberAuthState, form: FormData): Promise<MemberAuthState> {
  return sendMemberEmail(form, true);
}

export async function memberResendConfirmation(_previous: MemberAuthState, form: FormData): Promise<MemberAuthState> {
  return sendMemberEmail(form, false);
}

async function sendMemberEmail(form: FormData, recovery: boolean): Promise<MemberAuthState> {
  if (!memberAuthConfigured()) return { error: 'Email authentication is temporarily unavailable. Please try again later.' };
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
  try {
    const supabase = createClient(await cookies());
    const destination = memberAuthRedirect((await headers()).get('origin'), recovery);
    const { error } = recovery
      ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: destination })
      : await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: destination } });
    if (error) return { error: 'Unable to send the email. Please wait a moment and try again.' };
  } catch { return { error: 'Unable to connect. Please try again.' }; }
  return { notice: recovery ? 'If an account exists for this email, a password reset link is on its way. Open it in this browser.' : 'If your account needs confirmation, a new link is on its way. Open it in this browser.' };
}

export async function memberUpdatePassword(_previous: MemberAuthState, form: FormData): Promise<MemberAuthState> {
  if (!await getMember()) return { error: 'Your session has expired. Request a new password reset email.' };
  const password = String(form.get('password') ?? '');
  if (password.length < 12) return { error: 'Use at least 12 characters for your new password.' };
  if (password !== String(form.get('confirm') ?? '')) return { error: 'Passwords do not match.' };
  try {
    const { error } = await createClient(await cookies()).auth.updateUser({ password });
    if (error) return { error: 'Unable to update your password. Try a different password or request a new reset link.' };
  } catch { return { error: 'Unable to connect. Please try again.' }; }
  return { notice: 'Your password has been saved. You can now return to your event library.' };
}

export async function memberSendCode(_previous: MemberAuthState, form: FormData): Promise<MemberAuthState> {
  if (!memberAuthConfigured()) return { error: 'Email sign-in is temporarily unavailable. Please try again later.' };
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
  try {
    const { error } = await createClient(await cookies()).auth.signInWithOtp({ email, options: {
      shouldCreateUser: false,
      emailRedirectTo: memberAuthRedirect((await headers()).get('origin')),
    } });
    if (error) return { error: 'Unable to send a code. Check that you have created a member account, or wait a moment before trying again.' };
  } catch { return { error: 'Unable to connect. Please try again.' }; }
  return { notice: 'Check your email for your sign-in code. Use the latest code; you can request a new one after a minute.' };
}

export async function memberVerifyCode(_previous: MemberAuthState, form: FormData): Promise<MemberAuthState> {
  if (!memberAuthConfigured()) return { error: 'Email sign-in is temporarily unavailable. Please try again later.' };
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const token = String(form.get('token') ?? '').trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6,10}$/.test(token)) return { error: 'Enter your email and the code from your email.' };
  try {
    const { data, error } = await createClient(await cookies()).auth.verifyOtp({ email, token, type: 'email' });
    if (error || !data.user?.email_confirmed_at || data.user.is_anonymous) return { error: 'This code is invalid or expired. Check the latest email or request a new code.' };
  } catch { return { error: 'Unable to connect. Please try again.' }; }
  redirect('/members');
}
