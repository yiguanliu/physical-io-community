import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdmin } from '@/lib/admin/contracts';
import { uploadMedia } from '@/lib/marketing/storage';

export const runtime = 'nodejs';
const json = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'private, no-store'}});

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({error: 'Request origin is not allowed.'}, 403);
  const {data: {user}, error} = await createClient(await cookies()).auth.getUser();
  if (error || !isAdmin(user)) return json({error: 'Sign in with an authorized admin account.'}, 401);
  if (Number(request.headers.get('content-length')) > 4 * 1024 * 1024 + 16384) return json({error: 'Choose an image up to 4 MB.'}, 413);
  try {
    const file = (await request.formData()).get('image');
    if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return json({error: 'Choose an image up to 4 MB.'}, 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
      : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' ? 'image/webp'
      : ['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6)) ? 'image/gif' : null;
    if (!mime) return json({error: 'Choose a PNG, JPEG, WebP or GIF image.'}, 400);
    const media = await uploadMedia(bytes, {mime, prefix: `email/${user!.id}`});
    return json({url: media.publicUrl});
  } catch {
    return json({error: 'Your image could not be uploaded. Please try again.'}, 503);
  }
}
