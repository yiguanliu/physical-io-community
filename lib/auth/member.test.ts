import { beforeEach, describe, expect, it, vi } from 'vitest';
const profiles = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/admin/database', () => ({ database: () => profiles }));
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
  profiles.query.mockResolvedValue({rows:[{id:'profile'}]});
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
    const user = { id: 'member', email: 'member@example.com', email_confirmed_at: '2026-09-14', app_metadata: {} };
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
  it('routes account creation to the required join form without creating an auth account', async () => {
    await expect(memberSignup({}, credentials())).rejects.toThrow('REDIRECT:/join');
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it('routes verified users without a database profile to join', async () => {
    profiles.query.mockResolvedValue({rows:[]});
    auth.getUser.mockResolvedValue({data:{user:{email:'new@example.com',email_confirmed_at:'2026-09-15'}},error:null});
    await expect(requireMember()).rejects.toThrow('REDIRECT:/join?status=profile_required');
  });
  it('does not grant access when the member database is unavailable', async () => {
    profiles.query.mockRejectedValue(new Error('database unavailable'));
    auth.getUser.mockResolvedValue({data:{user:{email:'member@example.com',email_confirmed_at:'2026-09-15'}},error:null});
    await expect(requireMember()).rejects.toThrow('database unavailable');
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

it('allows existing database members to create their email-code login', async () => {
  auth.signInWithOtp.mockResolvedValue({ error: null });
  expect(await memberSendCode({}, credentials())).toHaveProperty('notice');
  expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'member@example.com', options: { shouldCreateUser: true, emailRedirectTo: 'https://www.physical-io.com/auth/confirm' } });
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

it('requires the join form before sending a code to an unknown member', async () => {
 profiles.query.mockResolvedValue({rows:[]});
 await expect(memberSendCode({}, credentials())).rejects.toThrow('REDIRECT:/join?status=profile_required');
 expect(auth.signInWithOtp).not.toHaveBeenCalled();
});
it('does not send a code if the profile lookup fails', async () => {
 profiles.query.mockRejectedValue(new Error('offline'));
 expect(await memberSendCode({}, credentials())).toHaveProperty('error');
 expect(auth.signInWithOtp).not.toHaveBeenCalled();
});
