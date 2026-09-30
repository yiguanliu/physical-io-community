import type { Metadata } from 'next';
import { DEFAULT_HEADSHOT } from '@/lib/members/default-headshot';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, Grid3x3 } from 'lucide-react';
import PublicShell from '@/components/public/PublicShell';
import ShareButton from '@/components/events/ShareButton';
import PendingPhotoUpload from '@/components/members/PendingPhotoUpload';
import { CommunityAdminMark } from '@/components/members/VerifiedSeal';
import { getPublicProfile } from '@/lib/members/profile';
import { episodeDate, isUpcoming } from '@/lib/events/catalog';
import { SITE_URL } from '@/lib/site';
import '@/components/events/events.css';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  return getPublicProfile(slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const profile = await load((await params).slug).catch(() => null);
  if (!profile) return { robots: { index: false, follow: false } };
  const headline = [profile.jobTitle || profile.role, profile.company].filter(Boolean).join(' · ');
  return { title: `${profile.name} | Physical I/O member`, description: headline || 'Member of the Physical I/O community.', alternates: { canonical: `/members/${profile.slug}` } };
}

export default async function ProfilePage({ params }: Params) {
  const profile = await load((await params).slug);
  if (!profile) notFound();
  const headline = [profile.jobTitle || profile.role, profile.company].filter(Boolean).join(' · ');
  const attended = profile.events.filter(event => !isUpcoming(event.episode)).length;
  const going = profile.events.length - attended;
  return <PublicShell>
    <article className="profile-page">
      <PendingPhotoUpload />
      <header className="profile-header">
        <div className="profile-avatar"><img src={profile.photoUrl || DEFAULT_HEADSHOT} alt={profile.photoUrl ? `${profile.name}’s headshot` : ''} width={320} height={320} /></div>
        <div>
          <div className="profile-title-row">
            <h1 className="profile-name">{profile.name}{profile.communityAdmin && <CommunityAdminMark />}</h1>
            <ShareButton url={`${SITE_URL}/members/${profile.slug}`} title={`${profile.name} on Physical I/O`} label="Share profile" />
          </div>
          <ul className="profile-stats">
            <li><strong>{profile.events.length}</strong>{profile.events.length === 1 ? 'episode' : 'episodes'}</li>
            {going > 0 && <li><strong>{going}</strong>upcoming</li>}
            <li>Member since <strong>{new Date(profile.memberSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</strong></li>
          </ul>
          {headline && <p className="profile-role">{headline}</p>}
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          {(profile.linkedin || profile.website) && <div className="profile-links">
            {profile.linkedin && <a className="ui-button ui-button-ghost" href={profile.linkedin} target="_blank" rel="noopener noreferrer nofollow">LinkedIn <ArrowUpRight size={16} aria-hidden /></a>}
            {profile.website && <a className="ui-button ui-button-ghost" href={profile.website} target="_blank" rel="noopener noreferrer nofollow">Website <ArrowUpRight size={16} aria-hidden /></a>}
          </div>}
        </div>
      </header>
      <h2 className="profile-grid-heading"><Grid3x3 size={14} aria-hidden />Episodes</h2>
      {profile.events.length ? <div className="profile-grid">{profile.events.map(({ episode, attendance }) => <Link key={episode.slug} href={`/${episode.slug}`} aria-label={`Episode ${episode.number}: ${episode.title}, ${episodeDate(episode, 'short')}, ${attendance === 'online' ? 'online' : 'in person'}`}>
        <img src={episode.cover} alt="" width={900} height={900} loading="lazy" />
        <span className="profile-grid-tag" aria-hidden>{isUpcoming(episode) ? 'GOING' : attendance === 'online' ? 'ONLINE' : 'ATTENDED'}</span>
        <span className="profile-grid-overlay" aria-hidden><strong>EP.{episode.number} {episode.title}</strong><span>{episodeDate(episode, 'short')} · {attendance === 'online' ? 'Online' : 'In person'}</span></span>
      </Link>)}</div> : <p className="profile-empty">Episodes {profile.name.split(' ')[0]} attends will appear here.</p>}
    </article>
  </PublicShell>;
}
