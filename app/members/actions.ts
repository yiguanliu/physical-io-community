'use server';
import { revalidatePath } from 'next/cache';
import { getMember } from '@/lib/auth/member';
import { database } from '@/lib/admin/database';
import { uniqueProfileSlug } from '@/lib/members/slug';

export type ProfileState = { error?: string; notice?: string; slug?: string | null };
const clean = (form: FormData, key: string, max: number) => String(form.get(key) ?? '').trim().slice(0, max);

/** Members edit only their own row, identified by their verified session email. */
export async function saveProfile(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const member = await getMember();
  if (!member?.email) return { error: 'Your session has expired. Sign in again.' };
  const email = member.email.trim().toLowerCase();
  const isPublic = form.get('public') === 'on';
  const client = await database().connect();
  try {
    await client.query('begin');
    const current = await client.query('select id,full_name,public_slug from public.members where email_normalized=$1 for update', [email]);
    const row = current.rows[0];
    if (!row) { await client.query('rollback'); return { error: 'We couldn’t find your member profile.' }; }
    const slug = row.public_slug ?? (isPublic ? await uniqueProfileSlug(client, row.full_name, row.id) : null);
    await client.query('update public.members set job_title=$2,company=$3,bio=$4,profile_public=$5,public_slug=$6,updated_at=now() where id=$1',
      [row.id, clean(form, 'jobTitle', 160), clean(form, 'company', 160), clean(form, 'bio', 600), isPublic, slug]);
    await client.query("insert into public.audit_log(actor_name,action,entity_type,entity_id,summary) values($1,'member.profile','member',$2,$3)", [email, row.id, `Public profile ${isPublic ? 'shown' : 'hidden'} by member.`]);
    await client.query('commit');
    revalidatePath('/members');
    if (slug) revalidatePath(`/members/${slug}`);
    return { notice: isPublic ? 'Your profile is public.' : 'Your profile is hidden.', slug };
  } catch {
    await client.query('rollback');
    return { error: 'We couldn’t save your profile. Please try again.' };
  } finally { client.release(); }
}
