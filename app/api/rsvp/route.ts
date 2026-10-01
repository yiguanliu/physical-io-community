import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { database } from '@/lib/admin/database';
import { findEpisode, isUpcoming } from '@/lib/events/catalog';
import { ATTENDANCE, normalizeLinkedin, rsvpEligibility } from '@/lib/rsvp/model';
import { findRegistration, ownerCookie, rateLimit, RsvpNotAllowed, RsvpRateLimit, seats, SeatsFull, submitRsvp } from '@/lib/rsvp/service';

export const runtime = 'nodejs';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const email = z.email('Enter a valid email address.').trim().toLowerCase().max(254);
const text = z.string().trim().max(160);
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('lookup'), event: z.string().max(80), email }),
  z.object({
    action: z.literal('submit'), event: z.string().max(80), email, attendance: z.enum(ATTENDANCE),
    fullName: text.default(''), organisation: text.default(''), jobTitle: text.default(''),
    linkedin: z.string().trim().max(500).default('').refine(value => !value || Boolean(normalizeLinkedin(value)), 'Enter your LinkedIn profile link (linkedin.com/in/your-name).'),
  }).refine(value => (value.attendance !== 'in_person' && value.attendance !== 'admin') || value.fullName, { message: 'Add the name for your badge.' }),
  // Ticket holders editing their ticket: identified by the RSVP cookie on this device, not by email.
  z.object({
    action: z.literal('update'), event: z.string().max(80), attendance: z.enum(ATTENDANCE),
    fullName: text.default(''), organisation: text.default(''), jobTitle: text.default(''),
    linkedin: z.string().trim().max(500).default('').refine(value => !value || Boolean(normalizeLinkedin(value)), 'Enter your LinkedIn profile link (linkedin.com/in/your-name).'),
  }).refine(value => value.attendance === 'not_going' || value.fullName, { message: 'Add the name for your badge.' }),
]);

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return json({ error: 'Please submit from this website.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Invalid submission.' }, 415);
  const raw = await request.text();
  if (raw.length > 8000) return json({ error: 'Your answers are too long.' }, 413);
  let parsed;
  try { parsed = schema.safeParse(JSON.parse(raw)); } catch { return json({ error: 'Invalid submission.' }, 400); }
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || 'Check your answers.' }, 400);
  const input = parsed.data;
  const episode = findEpisode(input.event);
  if (!episode?.rsvp) return json({ error: 'RSVP is not open for this event.' }, 404);
  if (!isUpcoming(episode)) return json({ error: 'This event has finished.' }, 410);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  let db;
  try {
    db = await database().connect();
    await db.query('begin');
    await rateLimit(db, `rsvp:${createHash('sha256').update(ip).digest('hex')}`);
    if (input.action === 'lookup') {
      const registration = await findRegistration(db, episode.slug, input.email);
      const state = await seats(db, episode.slug);
      await db.query('commit');
      if (!registration) return json({ status: 'not_found', lumaUrl: episode.lumaUrl });
      const eligibility = rsvpEligibility(registration.lumaStatus);
      // Only what the attendee needs to confirm their badge; never the email list or other guests.
      return json({
        status: 'found', eligibility, firstName: registration.firstName || registration.fullName.split(' ')[0] || 'there',
        attendance: registration.attendance, seats: state,
        badge: eligibility === 'eligible' ? {
          fullName: registration.fullName, organisation: registration.organisation, jobTitle: registration.jobTitle, linkedin: registration.linkedin,
        } : null,
        lumaUrl: episode.lumaUrl,
      });
    }
    let email = input.action === 'submit' ? input.email : '';
    if (input.action === 'update') {
      const token = (await cookies()).get(ownerCookie(episode.slug))?.value ?? '';
      const owned = /^[a-f0-9]{48}$/.test(token) ? await db.query('select email_normalized from public.event_registrations where event_slug=$1 and owner_token=$2', [episode.slug, token]) : null;
      if (!owned?.rowCount) { await db.query('rollback'); return json({ error: 'Only the ticket holder can edit this ticket, on the device used to RSVP.' }, 403); }
      email = owned.rows[0].email_normalized;
    }
    const result = await submitRsvp(db, { ...input, email, details: input.action === 'update', eventSlug: episode.slug, category: '', linkedin: normalizeLinkedin(input.linkedin) });
    await db.query('commit');
    (await cookies()).set(ownerCookie(episode.slug), result.ownerToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 120 });
    if (input.attendance === 'not_going') return json({ ok: true, redirectTo: episode.lumaUrl });
    return json({ ok: true, redirectTo: `/${episode.slug}/ticket/${result.ticketSlug}` });
  } catch (error) {
    await db?.query('rollback');
    if (error instanceof RsvpRateLimit) return json({ error: 'Too many attempts. Please try again in an hour.' }, 429);
    if (error instanceof SeatsFull) return json({ error: 'The last in-person seat was just taken. You can still join us online.', seatsFull: true }, 409);
    if (error instanceof RsvpNotAllowed) return json({ error: 'We couldn’t confirm your registration. Check the email you used on Luma.' }, 403);
    console.error('RSVP unavailable');
    return json({ error: 'We couldn’t save your RSVP just now. Please try again.' }, 503);
  } finally { db?.release(); }
}
