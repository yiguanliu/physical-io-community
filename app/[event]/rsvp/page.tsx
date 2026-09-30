import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RsvpFlow from '@/components/events/RsvpFlow';
import { episodeDate, episodeTime, findEpisode, isUpcoming } from '@/lib/events/catalog';
import { publicSeats } from '@/lib/rsvp/service';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ event: string }> }): Promise<Metadata> {
  const episode = findEpisode((await params).event);
  return episode ? { title: `RSVP · Episode ${episode.number}: ${episode.title} | Physical I/O`, robots: { index: false, follow: false } } : {};
}

export default async function RsvpPage({ params }: { params: Promise<{ event: string }> }) {
  const episode = findEpisode((await params).event);
  if (!episode?.rsvp) notFound();
  return <RsvpFlow
    closed={!isUpcoming(episode)}
    initialSeats={await publicSeats(episode.slug)}
    episode={{ slug: episode.slug, number: episode.number, title: episode.title, date: episodeDate(episode), time: episodeTime(episode), venue: episode.venue, lumaUrl: episode.lumaUrl }}
  />;
}
