import { cookies } from 'next/headers';
import { database } from '@/lib/admin/database';
import { findEpisode } from '@/lib/events/catalog';
import { ownerCookie } from '@/lib/rsvp/service';
import { claimTicketEmail, releaseTicketEmail, sendTicketEmail } from '@/lib/rsvp/ticket-email';

export const runtime = 'nodejs';
const MAX_IMAGE = 3 * 1024 * 1024;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/**
 * Sends the ticket confirmation email. Called by the ticket page on the device that made the RSVP,
 * which also supplies the label as a PNG drawn in the browser (the same image as "Save image").
 */
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Please use this website.' }, 403);
  if (Number(request.headers.get('content-length')) > MAX_IMAGE + 16384) return json({ error: 'Ticket image is too large.' }, 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const episode = findEpisode(String(form.get('event') ?? ''));
  const ticket = String(form.get('ticket') ?? '');
  if (!episode?.rsvp || !/^[a-z0-9-]{3,60}$/.test(ticket)) return json({ error: 'Ticket not found.' }, 404);
  const token = (await cookies()).get(ownerCookie(episode.slug))?.value;
  if (!token || !/^[a-f0-9]{48}$/.test(token)) return json({ error: 'Only the ticket holder can request this email.' }, 403);

  const db = database();
  const claim = await claimTicketEmail(db, episode.slug, ticket, token).catch(() => undefined);
  if (claim === undefined) return json({ error: 'Email is unavailable right now.' }, 503);
  if (!claim) return json({ ok: true, sent: false });

  let imageUrl: string | null = null;
  const image = form.get('image');
  if (image instanceof File && image.size && image.size <= MAX_IMAGE) {
    const bytes = Buffer.from(await image.arrayBuffer());
    // Uploading is best effort: the email still goes out with the ticket link.
    if (bytes.subarray(0, 8).equals(PNG)) {
      try {
        const { uploadMedia } = await import('@/lib/marketing/storage');
        imageUrl = (await uploadMedia(bytes, { mime: 'image/png', prefix: `tickets/${episode.slug}` })).publicUrl;
        await db.query('update public.event_registrations set ticket_image_url=$2 where id=$1', [claim.id, imageUrl]);
      } catch { console.error('Ticket image upload failed'); imageUrl = null; }
    }
  }
  try {
    await sendTicketEmail(claim, episode, imageUrl);
    return json({ ok: true, sent: true });
  } catch {
    console.error('Ticket email failed');
    await releaseTicketEmail(db, claim).catch(() => null);
    return json({ error: 'We couldn’t email your ticket just now.' }, 503);
  }
}
