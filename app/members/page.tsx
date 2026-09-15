import type { Metadata } from 'next';
import PublicShell from '@/components/public/PublicShell';
import Library from '@/components/members/Library';
import { requireMember } from '@/lib/auth/member';
import { getPublicEvents } from '@/lib/public-events';
import { memberEpisodes } from '@/lib/member-content';
import '@/components/members/members.css';
export const metadata: Metadata = { title: 'Members | Physical I/O', robots: { index: false, follow: false } };
export default async function MembersPage() {
  await requireMember();
  const { events, unavailable } = await getPublicEvents();
  return <PublicShell member><Library episodes={memberEpisodes} events={events} eventsUnavailable={unavailable} /></PublicShell>;
}
