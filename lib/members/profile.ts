import 'server-only';
import { database } from '@/lib/admin/database';
import { findEpisode, type PublicEpisode } from '@/lib/events/catalog';

export type PublicProfile = {
  slug: string; name: string; jobTitle: string; company: string; role: string; city: string; bio: string;
  linkedin: string; website: string; memberSince: string; photoUrl: string; communityAdmin: boolean;
  events: { episode: PublicEpisode; attendance: 'in_person' | 'online' }[];
};

/**
 * A profile is public only when the member opted in AND verified their email, so nobody can
 * publish a page under someone else's address through the unauthenticated join form.
 */
export async function getPublicProfile(slug: string): Promise<PublicProfile | null> {
  const db = database();
  const result = await db.query(
    `select m.id,m.public_slug,m.full_name,m.job_title,m.company,m.professional_role,m.city,m.bio,m.linkedin_url,m.website_url,m.signed_up_at,m.photo_url,m.community_admin
     from public.members m
     where m.public_slug=$1 and m.profile_public and m.status<>'archived'
       and exists(select 1 from auth.users u where lower(trim(u.email))=m.email_normalized and u.email_confirmed_at is not null and u.deleted_at is null)`,
    [slug],
  );
  const m = result.rows[0];
  if (!m) return null;
  const attended = await db.query(
    `select event_slug,attendance from public.event_registrations
     where (member_id=$1 or email_normalized=(select email_normalized from public.members where id=$1)) and attendance in ('in_person','online')`,
    [m.id],
  );
  return {
    slug: m.public_slug, name: m.full_name, jobTitle: m.job_title, company: m.company, role: m.professional_role, city: m.city, bio: m.bio,
    linkedin: m.linkedin_url, website: m.website_url, memberSince: new Date(m.signed_up_at).toISOString(), photoUrl: m.photo_url, communityAdmin: m.community_admin,
    events: attended.rows
      .map(row => ({ episode: findEpisode(row.event_slug), attendance: row.attendance }))
      .filter((row): row is PublicProfile['events'][number] => Boolean(row.episode))
      .sort((a, b) => b.episode.startsAt.localeCompare(a.episode.startsAt)),
  };
}

export type OwnProfile = { slug: string | null; name: string; jobTitle: string; company: string; bio: string; isPublic: boolean; photoUrl: string; communityAdmin: boolean };
export async function getOwnProfile(email: string): Promise<OwnProfile | null> {
  const result = await database().query('select public_slug,full_name,job_title,company,bio,profile_public,photo_url,community_admin from public.members where email_normalized=$1', [email.trim().toLowerCase()]);
  const m = result.rows[0];
  return m ? { slug: m.public_slug, name: m.full_name, jobTitle: m.job_title, company: m.company, bio: m.bio, isPublic: m.profile_public, photoUrl: m.photo_url, communityAdmin: m.community_admin } : null;
}
