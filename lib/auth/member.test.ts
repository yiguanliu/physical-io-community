import { beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ getUser: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn(), resend: vi.fn(), updateUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({}), headers: async () => new Headers({ origin: 'http://localhost:3000' }) }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock('@/utils/supabase/server', () => ({ createClient: () => ({ auth }) }));
import { getMember, requireMember } from './member';
import { memberLogin, memberSignup, memberRecovery, memberUpdatePassword, memberSendCode, memberVerifyCode } from '@/app/login/actions';
function credentials() { const form = new FormData(); form.set('email', 'member@example.com'); form.set('password', 'correct-password'); return form; }
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test');
});
describe('member access', () => {
  it('redirects unauthenticated visitors without returning library content', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireMember()).rejects.toThrow('REDIRECT:/login');
  });
  it('rejects anonymous and unconfirmed accounts', async () => {
    for (const user of [{ email_confirmed_at: null }, { email_confirmed_at: '2026-09-14', is_anonymous: true }]) {
      auth.getUser.mockResolvedValue({ data: { user }, error: null });
      expect(await getMember()).toBeNull();
    }
  });
  it('allows a confirmed member without granting admin rights', async () => {
    const user = { id: 'member', email_confirmed_at: '2026-09-14', app_metadata: {} };
    auth.getUser.mockResolvedValue({ data: { user }, error: null });
    expect(await requireMember()).toBe(user);
  });
  it('fails closed on auth service errors', async () => {
    auth.getUser.mockRejectedValue(new Error('offline'));
    expect(await getMember()).toBeNull();
  });
  it('redirects successful login to the member library', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { email_confirmed_at: '2026-09-14' } }, error: null });
    await expect(memberLogin({}, credentials())).rejects.toThrow('REDIRECT:/members');
  });
  it('returns an error on invalid credentials', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid' } });
    expect(await memberLogin({}, credentials())).toHaveProperty('error');
  });
  it('requires consent before registration and never assigns admin metadata', async () => {
    const form = credentials();
    expect(await memberSignup({}, form)).toHaveProperty('error');
    expect(auth.signUp).not.toHaveBeenCalled();
    form.set('terms', 'on');
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await memberSignup({}, form)).toHaveProperty('notice');
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'member@example.com', password: 'correct-password', options: { emailRedirectTo: 'https://www.physical-io.com/auth/confirm' } });
  });
});

it('sends password recovery to the member callback', async () => {
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  expect(await memberRecovery({}, credentials())).toHaveProperty('notice');
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('member@example.com', { redirectTo: 'https://www.physical-io.com/auth/confirm?flow=recovery' });
});
it('rejects password changes without a verified session', async () => {
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect(await memberUpdatePassword({}, credentials())).toHaveProperty('error');
  expect(auth.updateUser).not.toHaveBeenCalled();
});
it('requires matching new passwords', async () => {
  auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: '2026-09-14' } }, error: null });
  expect(await memberUpdatePassword({}, credentials())).toEqual({ error: 'Passwords do not match.' });
  expect(auth.updateUser).not.toHaveBeenCalled();
});

it('sends codes without silently creating an account', async () => {
  auth.signInWithOtp.mockResolvedValue({ error: null });
  expect(await memberSendCode({}, credentials())).toHaveProperty('notice');
  expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'member@example.com', options: { shouldCreateUser: false, emailRedirectTo: 'https://www.physical-io.com/auth/confirm' } });
});
it('does not create a session for an invalid code', async () => {
  const form = credentials(); form.set('token', '123456');
  auth.verifyOtp.mockResolvedValue({ data: { user: null }, error: { message: 'Expired' } });
  expect(await memberVerifyCode({}, form)).toHaveProperty('error');
});
it('takes verified email-code users to the library', async () => {
  const form = credentials(); form.set('token', '123456');
  auth.verifyOtp.mockResolvedValue({ data: { user: { email_confirmed_at: '2026-09-14' } }, error: null });
  await expect(memberVerifyCode({}, form)).rejects.toThrow('REDIRECT:/members');
  expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'member@example.com', token: '123456', type: 'email' });
});
