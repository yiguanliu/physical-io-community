import type { Metadata } from 'next';
import PublicShell from '@/components/public/PublicShell';
import Library from '@/components/members/Library';
import { requireMember } from '@/lib/auth/member';
import { memberEpisodes } from '@/lib/member-content';
import '@/components/members/members.css';
export const metadata: Metadata = { title: 'Event library | Physical I/O', robots: { index: false, follow: false } };
export default async function MembersPage() {
  await requireMember();
  return <PublicShell><Library episodes={memberEpisodes} /></PublicShell>;
}
