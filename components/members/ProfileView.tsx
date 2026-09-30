import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Grid3x3 } from 'lucide-react';
import ShareButton from '@/components/events/ShareButton';
import { CommunityAdminMark } from './VerifiedSeal';
import ProfileTabs from './ProfileTabs';
import { DEFAULT_HEADSHOT } from '@/lib/members/default-headshot';
import { episodeDate, isUpcoming } from '@/lib/events/catalog';
import type { MemberProfile } from '@/lib/members/profile';
import { SITE_URL } from '@/lib/site';
import '@/components/events/events.css';

type Owner = { settings: ReactNode; recordings: ReactNode; events: ReactNode };

/**
 * One profile layout for everyone. The owner sees the same page with a settings icon,
 * a public/private indicator and member-only tabs; visitors see only the public page.
 */
export default function ProfileView({ profile, owner }: { profile: MemberProfile; owner?: Owner }) {
  const headline = [profile.jobTitle || profile.role, profile.company].filter(Boolean).join(' · ');
  const going = profile.events.filter(event => isUpcoming(event.episode)).length;
  const publicUrl = profile.isPublic && profile.slug ? `${SITE_URL}/members/${profile.slug}` : null;
  const episodes = profile.events.length ? <div className="profile-grid">{profile.events.map(({ episode, attendance }) => <Link key={episode.slug} href={`/${episode.slug}`} aria-label={`Episode ${episode.number}: ${episode.title}, ${episodeDate(episode, 'short')}, ${attendance === 'online' ? 'online' : 'in person'}`}>
    <img src={episode.cover} alt="" width={900} height={900} loading="lazy" />
    <span className="profile-grid-tag" aria-hidden>{isUpcoming(episode) ? 'GOING' : attendance === 'online' ? 'ONLINE' : 'ATTENDED'}</span>
    <span className="profile-grid-overlay" aria-hidden><strong>EP.{episode.number} {episode.title}</strong><span>{episodeDate(episode, 'short')} · {attendance === 'online' ? 'Online' : 'In person'}</span></span>
  </Link>)}</div> : <p className="profile-empty">{owner ? 'Episodes you attend will appear here.' : `Episodes ${profile.name.split(' ')[0]} attends will appear here.`}</p>;

  return <article className="profile-page">
    <header className="profile-header">
      <div className="profile-avatar"><img src={profile.photoUrl || DEFAULT_HEADSHOT} alt={profile.photoUrl ? `${profile.name}’s headshot` : ''} width={320} height={320} /></div>
      <div>
        <div className="profile-title-row">
          <h1 className="profile-name">{profile.name}{profile.communityAdmin && <CommunityAdminMark />}</h1>
          {owner?.settings}
          {publicUrl && <ShareButton url={publicUrl} title={`${profile.name} on Physical I/O`} label="Share profile" />}
        </div>
        {owner && <p className="profile-visibility" data-public={profile.isPublic || undefined}>
          <span className="profile-visibility-dot" aria-hidden />
          {profile.isPublic && profile.slug
            ? <>Public · <Link href={`/members/${profile.slug}`}>physical-io.com/members/{profile.slug}</Link></>
            : 'Private · only you can see this page. Make it public in settings.'}
        </p>}
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
    {owner
      ? <ProfileTabs items={[
        { value: 'episodes', label: 'Episodes', content: episodes },
        { value: 'recordings', label: 'Recordings', content: owner.recordings },
        { value: 'events', label: 'Upcoming events', content: owner.events },
      ]} />
      : <><h2 className="profile-grid-heading"><Grid3x3 size={14} aria-hidden />Episodes</h2>{episodes}</>}
  </article>;
}
