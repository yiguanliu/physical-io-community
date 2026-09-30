import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowUpRight, CalendarDays, MapPin, Ticket, Video } from 'lucide-react';
import PublicShell from '@/components/public/PublicShell';
import { ActionLink, SectionHeading, ClosingNote } from '@/components/public/Sections';
import { Card } from '@/workspace-ui/src';
import { episodeDate, episodeTime, findEpisode, isUpcoming } from '@/lib/events/catalog';
import { publicSeats } from '@/lib/rsvp/service';
import '@/components/events/events.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ event: string }> }): Promise<Metadata> {
  const episode = findEpisode((await params).event);
  if (!episode) return {};
  const title = `Episode ${episode.number}: ${episode.title} | Physical I/O`;
  return { title, description: episode.summary, alternates: { canonical: `/${episode.slug}` }, openGraph: { title, description: episode.summary, url: `/${episode.slug}`, images: [episode.cover] } };
}

export default async function EpisodePage({ params }: { params: Promise<{ event: string }> }) {
  const episode = findEpisode((await params).event);
  if (!episode) notFound();
  const upcoming = isUpcoming(episode);
  const seats = upcoming && episode.rsvp ? await publicSeats(episode.slug) : null;
  return <PublicShell>
    <article className="episode-page">
      <header className="episode-hero">
        <img className="episode-hero-cover" src={episode.cover} alt={`Episode ${episode.number}: ${episode.title} cover`} width={900} height={900} />
        <div className="episode-hero-copy">
          <p className="public-eyebrow"><i />Episode {episode.number} · {episode.theme}</p>
          <h1>{episode.title}</h1>
          <p className="episode-question">{episode.question}</p>
          <dl className="episode-facts">
            <div><dt><CalendarDays size={16} aria-hidden />When</dt><dd>{episodeDate(episode)}<span>{episodeTime(episode)} London time</span></dd></div>
            <div><dt><MapPin size={16} aria-hidden />Where</dt><dd>{episode.venueDetail}</dd></div>
            {episode.format === 'hybrid' && <div><dt><Video size={16} aria-hidden />Online</dt><dd>Livestream via Google Meet{episode.onlineTime && <span>{episode.onlineTime} London time</span>}</dd></div>}
            {seats && <div><dt><Ticket size={16} aria-hidden />In person</dt><dd>{seats.full ? 'Full. Join us online.' : `${seats.left} of ${seats.capacity} seats left`}</dd></div>}
          </dl>
          <div className="public-actions">
            {upcoming && episode.rsvp && <ActionLink href={`/${episode.slug}/rsvp`} primary>RSVP and get your ticket</ActionLink>}
            {episode.recording && <ActionLink href="/members" primary>Watch the recording</ActionLink>}
            <ActionLink href={episode.lumaUrl} external>{upcoming ? 'Register on Luma' : 'View on Luma'}</ActionLink>
          </div>
        </div>
      </header>

      <section className="public-section episode-about">
        <SectionHeading title={episode.theme} />
        {episode.about.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      </section>

      {episode.speakers.length > 0 && <section className="public-section">
        <SectionHeading title="Who’s speaking" />
        <div className="public-tiers">{episode.speakers.map(speaker => <Card className="public-card" key={speaker.name}><h3>{speaker.name}</h3><p>{speaker.topic}</p></Card>)}</div>
      </section>}

      {episode.schedule.length > 0 && <section className="public-section">
        <SectionHeading title="The evening" />
        <ol className="episode-schedule">{episode.schedule.map(item => <li key={item.time}><time>{item.time}</time><span>{item.label}</span></li>)}</ol>
        <ul className="episode-notes">{episode.notes.map(note => <li key={note}>{note}</li>)}</ul>
      </section>}

      {upcoming && episode.rsvp
        ? <ClosingNote title="Already registered on Luma?" href={`/${episode.slug}/rsvp`} action="RSVP now">Tell us whether you’re joining in person or online. In-person guests get a printable badge; online guests get the Google Meet link.</ClosingNote>
        : <ClosingNote title="Catch the next episode." href="/events" action="See all episodes">Join the community to hear about new gatherings and watch past recordings.</ClosingNote>}
      <p className="episode-luma-note"><a href={episode.lumaUrl} target="_blank" rel="noopener noreferrer">Event page on Luma <ArrowUpRight size={14} aria-hidden /></a> Registration and cancellation are handled by Luma.</p>
    </article>
  </PublicShell>;
}
