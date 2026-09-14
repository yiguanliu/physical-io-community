import { describe, expect, it, vi, afterEach } from 'vitest';
import { memberAuthRedirect } from './member-redirect';
afterEach(() => vi.unstubAllEnvs());
describe('member email destinations', () => {
  it('always sends recovery emails to the public website', () => {
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://preview.example', null]) {
      expect(memberAuthRedirect(origin, true)).toBe('https://www.physical-io.com/auth/confirm?flow=recovery');
    }
  });
  it('does not inherit local environment or untrusted request origins', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
    expect(memberAuthRedirect('https://attacker.example')).toBe('https://www.physical-io.com/auth/confirm');
  });
});
