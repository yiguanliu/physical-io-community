import { beforeEach, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({}) }));
vi.mock('@/utils/supabase/server', () => ({ createClient: () => ({ auth }) }));
vi.mock('@/lib/auth/member', () => ({ memberAuthConfigured: () => true }));
import { GET } from '@/app/auth/confirm/route';
beforeEach(() => vi.resetAllMocks());
it('verifies recovery tokens on the public domain without a local PKCE cookie', async () => {
  auth.verifyOtp.mockResolvedValue({ error: null });
  const response = await GET(new Request('https://www.physical-io.com/auth/confirm?flow=recovery&token_hash=test-hash&type=recovery'));
  expect(response.headers.get('location')).toBe('https://www.physical-io.com/login/reset-password');
  expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'test-hash', type: 'recovery' });
  expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
});
it('rejects unsupported token types', async () => {
  const response = await GET(new Request('https://www.physical-io.com/auth/confirm?token_hash=test-hash&type=invite'));
  expect(response.headers.get('location')).toContain('status=invalid_link');
  expect(auth.verifyOtp).not.toHaveBeenCalled();
});
it('rejects expired recovery tokens', async () => {
  auth.verifyOtp.mockResolvedValue({ error: { message: 'Expired' } });
  const response = await GET(new Request('https://www.physical-io.com/auth/confirm?token_hash=test-hash&type=recovery'));
  expect(response.headers.get('location')).toContain('status=invalid_link');
});
