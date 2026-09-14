import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ZodError } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { isAdmin } from '@/lib/admin/contracts';
import { database } from '@/lib/admin/database';
import { playlistSchema } from '@/lib/robot/playlist';
import { readPlaylist, savePlaylist, PlaylistConflict } from '@/lib/robot/playlist-store';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function authorize() {
  const { data: { user }, error } = await createClient(await cookies()).auth.getUser();
  return !error && isAdmin(user) ? user : null;
}
function failure(error: unknown) {
  if (error instanceof ZodError) return json({ error: error.issues.map(issue => issue.message).join(' ') }, 400);
  if (error instanceof SyntaxError) return json({ error: 'Use valid JSON.' }, 400);
  if (error instanceof PlaylistConflict) return json({ error: error.message }, 409);
  return json({ error: 'The message store is unavailable. Check that the OHI playlist migration has been applied, then retry.' }, 503);
}
export async function GET(request: Request) {
  try {
    const user = await authorize();
    if (new URL(request.url).searchParams.has('access')) return json({ canEdit: !!user });
    if (!user) return json({ error: 'Admin sign-in required.' }, 401);
    return json(await readPlaylist());
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Request origin is not allowed.' }, 403);
    const user = await authorize();
    if (!user) return json({ error: 'Admin sign-in required.' }, 401);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Use application/json.' }, 415);
    const body = await request.text();
    if (body.length > 20000) return json({ error: 'Playlist is too large.' }, 413);
    const input = playlistSchema.parse(JSON.parse(body));
    const db = await database().connect();
    try {
      await db.query('BEGIN');
      const saved = await savePlaylist(db, input, { id: user.id, name: user.email ?? 'Admin' });
      await db.query('COMMIT');
      return json(saved);
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  } catch (error) { return failure(error); }
}
