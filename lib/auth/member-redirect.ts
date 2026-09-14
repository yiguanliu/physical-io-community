import { SITE_URL } from '@/lib/site';

/** Auth emails always return to the public site, never the requesting preview host. */
export function memberAuthRedirect(_origin: string | null, recovery = false) {
  return `${SITE_URL}/auth/confirm${recovery ? '?flow=recovery' : ''}`;
}
