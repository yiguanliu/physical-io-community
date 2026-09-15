import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { memberAuthConfigured } from '@/lib/auth/member';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const recovery = type === 'recovery' || url.searchParams.get('flow') === 'recovery';
  const destination = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url.origin));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
  const failure = () => destination(recovery ? '/login?status=invalid_link' : '/login?status=request_code');
  if ((!code && !tokenHash) || !memberAuthConfigured()) return failure();
  try {
    const client = createClient(await cookies());
    if (tokenHash && type !== 'recovery' && type !== 'signup' && type !== 'email') return failure();
    const { error } = tokenHash
      ? await client.auth.verifyOtp({ token_hash: tokenHash, type: type as 'recovery' | 'signup' | 'email' })
      : await client.auth.exchangeCodeForSession(code!);
    if (error) return failure();
  } catch { return failure(); }
  return destination(recovery ? '/login/reset-password' : '/login?status=email_confirmed');
}
