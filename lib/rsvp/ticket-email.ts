import 'server-only';
import type { PoolClient } from 'pg';
import { markdownToHtml, markdownToPlainText } from '@/lib/marketing/markdown';
import { renderEmailHtml } from '@/lib/email/template';
import { deliverySettings, sendEmail, type EmailTransport } from '@/lib/email/transport';
import { episodeDate, episodeTime, type PublicEpisode } from '@/lib/events/catalog';
import { meetUrl } from './service';

/** The community team is copied on every ticket confirmation. */
export const TICKET_EMAIL_CC = ['soul@physical-io.com', 'sylvan@physical-io.com', 'anthony@physical-io.com'];

type Claim = { id: string; email: string; firstName: string; fullName: string; attendance: 'in_person' | 'online'; ticketSlug: string; previous: string | null };

/**
 * Claims the confirmation email for the device that owns the ticket: once per ticket type,
 * so switching between online and in person sends a fresh ticket. Atomic across instances.
 */
export async function claimTicketEmail(db: Pick<PoolClient, 'query'>, eventSlug: string, ticketSlug: string, ownerToken: string): Promise<Claim | null> {
  const result = await db.query(
    `update public.event_registrations r set ticket_emailed_attendance=r.attendance,ticket_emailed_at=now()
     from (select id,ticket_emailed_attendance previous from public.event_registrations where event_slug=$1 and ticket_slug=$2 and owner_token=$3 for update) old
     where r.id=old.id and r.attendance in ('in_person','online') and r.ticket_emailed_attendance is distinct from r.attendance
     returning r.id,r.email,r.first_name,r.full_name,r.attendance,r.ticket_slug,old.previous`,
    [eventSlug, ticketSlug, ownerToken],
  );
  const row = result.rows[0];
  return row ? { id: row.id, email: row.email, firstName: row.first_name, fullName: row.full_name, attendance: row.attendance, ticketSlug: row.ticket_slug, previous: row.previous } : null;
}

/** Releases a claim when delivery fails, so the next visit to the ticket retries. */
export async function releaseTicketEmail(db: Pick<PoolClient, 'query'>, claim: Claim) {
  await db.query('update public.event_registrations set ticket_emailed_attendance=$2,ticket_emailed_at=null where id=$1', [claim.id, claim.previous]);
}

export function ticketEmail(claim: Claim, episode: PublicEpisode, imageUrl: string | null) {
  const site = deliverySettings().site;
  const ticketUrl = `${site}/${episode.slug}/ticket/${claim.ticketSlug}`;
  const online = claim.attendance === 'online';
  const meet = online ? meetUrl(episode.slug) : null;
  const when = `${episodeDate(episode)} · ${online && episode.onlineTime ? episode.onlineTime : episodeTime(episode)} (London time)`;
  const body = [
    `Hi ${claim.firstName || claim.fullName.split(' ')[0] || 'there'},`,
    `You’re in for **Physical I/O Episode ${episode.number}: ${episode.title}**, ${online ? 'joining online' : 'in person'}.`,
    `**When:** ${when}`,
    online
      ? `**Where:** Online via Google Meet${meet ? ` · [Join Google Meet](${meet})` : '. Your ticket shows the link before the event.'}`
      : `**Where:** ${episode.venueDetail}`,
    `[Open your ticket](${ticketUrl})`,
    ...(imageUrl ? [`![Your ticket for Episode ${episode.number}](${imageUrl})`] : []),
    online
      ? 'Keep your ticket to find the Google Meet link on the day.'
      : 'Show your ticket or printed label at check-in.',
    `Can’t make it any more? [Cancel on Luma](${episode.lumaUrl}) so someone on the waitlist can take your place.`,
    'See you there,\nPhysical I/O',
  ].join('\n\n');
  return {
    subject: `Your ticket: Physical I/O Episode ${episode.number}: ${episode.title} (${online ? 'online' : 'in person'})`,
    text: markdownToPlainText(body),
    html: renderEmailHtml({ previewText: `Your ${online ? 'online' : 'in-person'} ticket for Episode ${episode.number}: ${episode.title}`, body, bodyHtml: markdownToHtml(body) }),
  };
}

export async function sendTicketEmail(claim: Claim, episode: PublicEpisode, imageUrl: string | null, transport: EmailTransport = sendEmail) {
  const message = ticketEmail(claim, episode, imageUrl);
  return transport({ from: deliverySettings().from, to: claim.email, cc: TICKET_EMAIL_CC.filter(address => address !== claim.email.toLowerCase()), headers: {}, ...message }, `ticket/${claim.id}/${claim.attendance}`);
}
