import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/public/PublicShell';
import TicketView from '@/components/events/TicketView';
import { episodeDate, episodeTime, findEpisode, labelDate } from '@/lib/events/catalog';
import { ticketCode } from '@/lib/rsvp/model';
import { getTicket, meetUrl, ownerCookie } from '@/lib/rsvp/service';
import { SITE_URL } from '@/lib/site';
import '@/components/events/events.css';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ event: string; ticket: string }> };

async function load({ params }: Params) {
  const { event, ticket } = await params;
  const episode = findEpisode(event);
  if (!episode?.rsvp || !/^[a-z0-9-]{3,60}$/.test(ticket)) return null;
  try {
    const registration = await getTicket(episode.slug, ticket, (await cookies()).get(ownerCookie(episode.slug))?.value);
    return registration ? { episode, registration } : null;
  } catch { console.error('Ticket unavailable'); throw new Error('Ticket unavailable'); }
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const data = await load(props).catch(() => null);
  if (!data) return { robots: { index: false, follow: false } };
  const title = `${data.registration.fullName} · Episode ${data.episode.number}: ${data.episode.title}`;
  // Shared tickets are public links but never indexed.
  return { title: `${title} | Physical I/O`, robots: { index: false, follow: false }, openGraph: { title, description: `${data.episode.venue} · ${episodeDate(data.episode)}`, images: [data.episode.cover] } };
}

export default async function TicketPage(props: Params) {
  const data = await load(props);
  if (!data) notFound();
  const { episode, registration } = data;
  const path = `/${episode.slug}/ticket/${registration.ticketSlug}`;
  const attendance = registration.attendance === 'online' ? 'online' : 'in_person';
  return <PublicShell>
    <TicketView
      isOwner={registration.isOwner}
      emailPending={registration.isOwner && registration.emailedAttendance !== registration.attendance}
      ticketUrl={`${SITE_URL}${path}`}
      meetUrl={attendance === 'online' ? meetUrl(episode.slug) : null}
      account={registration.profileSlug ? { kind: 'profile', href: `/members/${registration.profileSlug}` } : registration.hasMember ? { kind: 'member', href: '/login' } : { kind: 'join', href: `/join?event=${episode.slug}` }}
      episode={{ slug: episode.slug, number: episode.number, title: episode.title, theme: episode.theme, date: episodeDate(episode), time: attendance === 'online' && episode.onlineTime ? episode.onlineTime : episodeTime(episode), venue: episode.venueDetail, cover: episode.cover, lumaUrl: episode.lumaUrl }}
      label={{
        name: registration.fullName, category: registration.category, jobTitle: registration.jobTitle, organisation: registration.organisation,
        linkedin: registration.linkedin, ticketUrl: `${SITE_URL}${path}`, code: ticketCode(episode.number, registration.ticketSlug!), attendance,
        episode: { number: episode.number, title: episode.title, theme: episode.theme, date: labelDate(episode), time: (attendance === 'online' && episode.onlineTime ? episode.onlineTime : episodeTime(episode)).replace('–', ' ~ '), room: episode.room.toUpperCase() },
      }}
    />
  </PublicShell>;
}
