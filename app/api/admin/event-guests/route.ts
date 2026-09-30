import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { isAdmin } from '@/lib/admin/contracts';
import { database } from '@/lib/admin/database';
import { EPISODES, findEpisode } from '@/lib/events/catalog';
import { parseLumaCsv } from '@/lib/rsvp/model';
import { adminGuests, importGuests, setCapacity } from '@/lib/rsvp/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function authorize() { const { data: { user }, error } = await createClient(await cookies()).auth.getUser(); return !error && isAdmin(user) ? user : null; }
const eventSlug = z.string().refine(slug => Boolean(findEpisode(slug)?.rsvp), 'Unknown event.');
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('capacity'), event: eventSlug, capacity: z.number().int().min(0).max(5000) }),
  z.object({ action: z.literal('import'), event: eventSlug, csv: z.string().min(1).max(5_000_000) }),
]);

export async function GET(request: Request) {
  try {
    if (!await authorize()) return json({ error: 'Sign in with an authorized admin account.' }, 401);
    const events = EPISODES.filter(episode => episode.rsvp).map(episode => ({ slug: episode.slug, name: `Episode ${episode.number}: ${episode.title}` }));
    const slug = new URL(request.url).searchParams.get('event') ?? events[0]?.slug;
    if (!slug || !findEpisode(slug)?.rsvp) return json({ events, guests: [], seats: null });
    return json({ events, event: slug, ...await adminGuests(slug) });
  } catch { console.error('Event guests unavailable'); return json({ error: 'The guest list could not load. Please retry.' }, 503); }
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Request origin is not allowed.' }, 403);
  const user = await authorize().catch(() => null);
  if (!user) return json({ error: 'Sign in with an authorized admin account.' }, 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, 400);
  const input = parsed.data, actor = user.email ?? 'Admin';
  const client = await database().connect();
  try {
    await client.query('begin');
    let summary: string, result: object = {};
    if (input.action === 'capacity') {
      await setCapacity(client, input.event, input.capacity, actor);
      summary = `${input.event}: in-person capacity set to ${input.capacity}`;
    } else {
      const { guests, errors } = parseLumaCsv(input.csv);
      if (!guests.length) { await client.query('rollback'); return json({ error: errors[0] ?? 'No guests found in this file.' }, 400); }
      const counts = await importGuests(client, input.event, guests);
      result = { ...counts, skipped: errors.length };
      summary = `${input.event}: Luma guests imported (${counts.created} new, ${counts.updated} updated, ${errors.length} skipped)`;
    }
    await client.query("insert into public.audit_log(actor_user_id,actor_name,action,entity_type,entity_id,summary) values($1,$2,$3,'event',$4,$5)", [user.id, actor, `event.${input.action === 'capacity' ? 'capacity' : 'guests.import'}`, input.event, summary]);
    await client.query('commit');
    return json({ ok: true, ...result });
  } catch {
    await client.query('rollback');
    console.error('Event guest update failed');
    return json({ error: 'The change could not be saved. Please retry.' }, 503);
  } finally { client.release(); }
}
