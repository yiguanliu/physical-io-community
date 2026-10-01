import type { Metadata } from 'next';
import PublicShell from '@/components/public/PublicShell';
import ProfileView from '@/components/members/ProfileView';
import ProfileSettingsButton from '@/components/members/ProfileSettingsButton';
import PendingPhotoUpload from '@/components/members/PendingPhotoUpload';
import { MemberEvents, MemberRecordings } from '@/components/members/Library';
import { requireMember } from '@/lib/auth/member';
import { memberEpisodes } from '@/lib/member-content';
import { getMemberProfile } from '@/lib/members/profile';
import '@/components/members/members.css';
export const metadata: Metadata = { title: 'Your profile | Physical I/O', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

// Signing in lands members on their own profile: the same page the public sees,
// plus settings, visibility and members-only tabs.
export default async function MembersPage() {
  const member = await requireMember();
  const profile = await getMemberProfile(member.email ?? '');
  if (!profile) return null;
  return <PublicShell member>
    <PendingPhotoUpload />
    <ProfileView profile={profile} owner={{
      settings: <ProfileSettingsButton profile={{ slug: profile.slug, name: profile.name, jobTitle: profile.jobTitle, company: profile.company, bio: profile.bio, isPublic: profile.isPublic, photoUrl: profile.photoUrl, communityAdmin: profile.communityAdmin, isAdmin: profile.isAdmin }} />,
      recordings: <MemberRecordings episodes={memberEpisodes} />,
      events: <MemberEvents />,
    }} />
  </PublicShell>;
}
