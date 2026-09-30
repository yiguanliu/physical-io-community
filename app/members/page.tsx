import type { Metadata } from 'next';
import PublicShell from '@/components/public/PublicShell';
import Library from '@/components/members/Library';
import { requireMember } from '@/lib/auth/member';
import { memberEpisodes } from '@/lib/member-content';
import { getOwnProfile } from '@/lib/members/profile';
import ProfileSettings from '@/components/members/ProfileSettings';
import PendingPhotoUpload from '@/components/members/PendingPhotoUpload';
import '@/components/members/members.css';
export const metadata: Metadata = { title: 'Members | Physical I/O', robots: { index: false, follow: false } };
export default async function MembersPage() {
  const member = await requireMember();
  const profile = await getOwnProfile(member.email ?? '');
  return <PublicShell member><Library episodes={memberEpisodes} profile={profile && <><PendingPhotoUpload /><ProfileSettings profile={profile} /></>} /></PublicShell>;
}
