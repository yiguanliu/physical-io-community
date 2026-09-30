import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getMember } from '@/lib/auth/member';
import { database } from '@/lib/admin/database';
import { PHOTO_MAX_BYTES, setMemberPhoto, uploadHeadshot } from '@/lib/members/photo';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

// Verified members only, so anonymous visitors cannot place files in public storage.
async function authorize(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return { error: json({ error: 'Please upload from this website.' }, 403) };
  const member = await getMember();
  if (!member?.email) return { error: json({ error: 'Sign in to update your photo.' }, 401) };
  return { member: { id: member.id, email: member.email } };
}

async function syncAccount(url: string | null) {
  // Keeps the admin avatar and the member photo the same image.
  try { await createClient(await cookies()).auth.updateUser({ data: { headshot_url: url } }); } catch { /* The member photo is already saved. */ }
}

async function revalidate(memberId: string) {
  const slug = (await database().query('select public_slug from public.members where id=$1', [memberId])).rows[0]?.public_slug;
  revalidatePath('/members');
  if (slug) revalidatePath(`/members/${slug}`);
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  if (Number(request.headers.get('content-length')) > PHOTO_MAX_BYTES + 16384) return json({ error: 'Choose an image smaller than 750 KB.' }, 413);
  try {
    const file = (await request.formData()).get('photo');
    if (!(file instanceof File) || !file.size || file.size > PHOTO_MAX_BYTES) return json({ error: 'Choose an image smaller than 750 KB.' }, 400);
    let url: string;
    try { url = await uploadHeadshot(Buffer.from(await file.arrayBuffer()), auth.member.id); }
    catch (error) { return json({ error: error instanceof Error && error.message.startsWith('Choose') ? error.message : 'Your photo could not be uploaded. Please try again.' }, error instanceof Error && error.message.startsWith('Choose') ? 400 : 503); }
    const memberId = await setMemberPhoto(auth.member.email, url);
    if (!memberId) return json({ error: 'Complete your member profile first.' }, 409);
    await syncAccount(url);
    await revalidate(memberId);
    return json({ url });
  } catch {
    console.error('Member photo upload failed');
    return json({ error: 'Your photo could not be saved. Please try again.' }, 503);
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  try {
    const memberId = await setMemberPhoto(auth.member.email, null);
    if (!memberId) return json({ error: 'Complete your member profile first.' }, 409);
    await syncAccount(null);
    await revalidate(memberId);
    return json({ ok: true });
  } catch { return json({ error: 'Your photo could not be removed. Please try again.' }, 503); }
}
