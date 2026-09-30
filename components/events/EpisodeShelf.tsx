import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/workspace-ui/src';
import { ActionLink } from '@/components/public/Sections';
import { episodeDate, episodeTime, isUpcoming, type PublicEpisode } from '@/lib/events/catalog';
import type { SeatState } from '@/lib/rsvp/model';

export function EpisodeTile({ episode }: { episode: PublicEpisode }) {
  const upcoming = isUpcoming(episode);
  return <Link className="episode-tile" href={`/${episode.slug}`}>
    <div className="episode-tile-art">
      <img src={episode.cover} alt="" width={900} height={900} loading="lazy" />
    </div>
    <h3><span className="episode-tile-label">Episode {episode.number}</span>{episode.title}</h3>
    <p>{episodeDate(episode, 'short')} · {episode.city}</p>
    <span className="episode-tile-status"><Badge tone={upcoming ? 'success' : 'neutral'}>{upcoming ? 'Upcoming' : episode.recording ? 'Replay for members' : 'Past episode'}</Badge></span>
  </Link>;
}

export function EpisodeShelf({ title, episodes, note }: { title: string; episodes: PublicEpisode[]; note?: string }) {
  if (!episodes.length) return null;
  return <section className="episode-shelf" aria-labelledby={`shelf-${title}`}>
    <header><h2 id={`shelf-${title}`}>{title}</h2>{note && <span>{note}</span>}</header>
    <div className="episode-row" role="list">{episodes.map(episode => <div role="listitem" key={episode.slug}><EpisodeTile episode={episode} /></div>)}</div>
  </section>;
}

export function EpisodeFeature({ episode, seats }: { episode: PublicEpisode; seats: SeatState | null }) {
  return <section className="episode-feature" aria-labelledby="feature-title">
    <img src={episode.cover} alt={`Episode ${episode.number}: ${episode.title} cover`} width={900} height={900} />
    <div className="episode-feature-copy">
      <p className="public-eyebrow"><i />Next episode · {episode.number}</p>
      <h2 id="feature-title">{episode.title}</h2>
      <p>{episode.summary}</p>
      <div className="episode-feature-meta"><span>{episodeDate(episode)}</span><span>{episodeTime(episode)}</span><span>{episode.venue}</span>{seats && <span>{seats.full ? 'In person full · online open' : `${seats.left} in-person seats left`}</span>}</div>
      <div className="public-actions">
        {episode.rsvp && <ActionLink href={`/${episode.slug}/rsvp`} primary>RSVP</ActionLink>}
        <ActionLink href={`/${episode.slug}`}>Episode details</ActionLink>
        <a className="ui-button ui-button-ghost" href={episode.lumaUrl} target="_blank" rel="noopener noreferrer">Luma <ArrowUpRight size={16} aria-hidden /></a>
      </div>
    </div>
  </section>;
}
