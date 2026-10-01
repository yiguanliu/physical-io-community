import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/auth/session';
import { setAdminPhoto } from '@/lib/admin/access';
import { PHOTO_MAX_BYTES, uploadHeadshot } from '@/lib/members/photo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const userId = z.uuid();

// Super admins only: upload or remove an administrator's headshot from Access.
async function authorize(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return { error: json({ error: 'Please upload from this website.' }, 403) };
  try { const admin = await requireSuperAdmin(); return { actor: { id: admin.id, name: admin.name } }; }
  catch { return { error: json({ error: 'Only super admins can change administrators’ photos.' }, 403) }; }
}

function refresh(slug: string | null) {
  revalidatePath('/admin/access');
  revalidatePath('/members');
  if (slug) revalidatePath(`/members/${slug}`);
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  if (Number(request.headers.get('content-length')) > PHOTO_MAX_BYTES + 16384) return json({ error: 'Choose an image smaller than 750 KB.' }, 413);
  try {
    const form = await request.formData();
    const id = userId.safeParse(form.get('userId'));
    const file = form.get('photo');
    if (!id.success) return json({ error: 'Choose an administrator.' }, 400);
    if (!(file instanceof File) || !file.size || file.size > PHOTO_MAX_BYTES) return json({ error: 'Choose an image smaller than 750 KB.' }, 400);
    let url: string;
    try { url = await uploadHeadshot(Buffer.from(await file.arrayBuffer()), `admin-${id.data}`); }
    catch (error) { const choose = error instanceof Error && error.message.startsWith('Choose'); return json({ error: choose ? (error as Error).message : 'The photo could not be uploaded. Please try again.' }, choose ? 400 : 503); }
    const result = await setAdminPhoto({ userId: id.data, url, actor: auth.actor! });
    refresh(result.slug);
    return json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/not found|Only administrators|member profile/.test(message)) return json({ error: message }, 409);
    console.error('Admin photo upload failed');
    return json({ error: 'The photo could not be saved. Please try again.' }, 503);
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const id = userId.safeParse(new URL(request.url).searchParams.get('userId'));
  if (!id.success) return json({ error: 'Choose an administrator.' }, 400);
  try {
    const result = await setAdminPhoto({ userId: id.data, url: null, actor: auth.actor! });
    refresh(result.slug);
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/not found|Only administrators|member profile/.test(message)) return json({ error: message }, 409);
    return json({ error: 'The photo could not be removed. Please try again.' }, 503);
  }
}
