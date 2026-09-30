import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/public/PublicShell';
import PendingPhotoUpload from '@/components/members/PendingPhotoUpload';
import ProfileView from '@/components/members/ProfileView';
import { getPublicProfile } from '@/lib/members/profile';

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

// The public view of a member's profile; members see the same page with settings at /members.
export default async function ProfilePage({ params }: Params) {
  const profile = await load((await params).slug);
  if (!profile) notFound();
  return <PublicShell>
    <PendingPhotoUpload />
    <ProfileView profile={{ ...profile, isPublic: true }} />
  </PublicShell>;
}
