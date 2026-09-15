'use client';
import { useEffect, useRef, useState } from 'react';
import { Play, ArrowUpRight } from 'lucide-react';
import { Alert, Button, Card } from '@/workspace-ui/src';
import { memberSignOut } from '@/app/login/actions';
import LumaCalendar from '@/components/public/LumaCalendar';
import { LUMA_URL } from '@/lib/site';
type Episode = { id: string; title: string; label: string; description: string; youtubeId: string; start: number };
export default function Library({ episodes }: { episodes: Episode[] }) {
  const [watching, setWatching] = useState<{ episode: Episode; start: number } | null>(null);
  const playerHeading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (watching) playerHeading.current?.focus(); }, [watching]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    setBusy(true); setError('');
    try { await memberSignOut(); } catch { setError('Could not sign out. Please try again.'); setBusy(false); }
  }
  return <div className="member-library">
    <div className="member-heading"><div><h1>Members</h1></div><Button variant="ghost" busy={busy} onClick={signOut}>Sign out</Button></div>
    {error && <Alert title="Sign out failed" tone="danger">{error}</Alert>}
    <section className="member-stack" aria-labelledby="member-events-title">
      <div className="member-heading"><h2 id="member-events-title">Events</h2><a className="ui-button ui-button-ghost" href={LUMA_URL} target="_blank" rel="noopener noreferrer">Full calendar <ArrowUpRight size={16} aria-hidden /></a></div>
      <LumaCalendar />
      <p id="luma-privacy-note" className="member-note">Registration is handled by Luma. Its privacy settings apply.</p>
    </section>
    {watching && <section className="member-player member-stack" aria-label="Video player">
      <div className="member-heading"><h2 ref={playerHeading} tabIndex={-1}>{watching.episode.title}</h2><Button variant="ghost" onClick={() => { setWatching(null); opener.current?.focus(); }}>Close player</Button></div>
      <iframe key={`${watching.episode.id}-${watching.start}`} title={`${watching.episode.title} — video player`} src={`https://www.youtube-nocookie.com/embed/${watching.episode.youtubeId}?start=${watching.start}&playsinline=1&rel=0`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      <p className="member-note">If the player is unavailable, <a href={`https://www.youtube.com/watch?v=${watching.episode.youtubeId}&t=${watching.start}s`} target="_blank" rel="noopener noreferrer">watch on YouTube <ArrowUpRight size={14} aria-hidden /></a>.</p>
    </section>}
    <section aria-labelledby="episodes-title" className="member-stack"><div className="member-heading"><h2 id="episodes-title">Past recordings</h2></div>
      <div className="member-grid">{episodes.map(episode => <Card key={episode.id} className="member-episode">
        <div className="member-cover"><img src="/assets/episodes/physical-io-manifesto-wide.png" alt="Episode 1: Manifesto — Designers in Physical AI, 20 August 2026" width={1920} height={1080} /></div>
        <div className="member-stack"><h3>{episode.title}</h3><div className="member-actions"><Button variant="primary" onClick={event => { opener.current = event.currentTarget; setWatching({ episode, start: 0 }); }}><Play size={16} aria-hidden /> Watch recording</Button></div></div>
      </Card>)}</div>
      {!episodes.length && <Card><h3>No replays yet</h3><p>Check back after our next gathering.</p></Card>}
      <p className="member-note">Selecting a replay loads YouTube’s embedded player. Playback is subject to YouTube’s privacy policy.</p>
    </section>
  </div>;
}
