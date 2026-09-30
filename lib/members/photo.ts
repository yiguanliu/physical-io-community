import 'server-only';
import { database } from '@/lib/admin/database';

export const PHOTO_MAX_BYTES = 750 * 1024;

/** Identifies PNG, JPEG or WebP from the file bytes; the browser-supplied type is not trusted. */
export function imageMime(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export async function uploadHeadshot(bytes: Buffer, ownerKey: string) {
  const mime = imageMime(bytes);
  if (!mime) throw new Error('Choose a PNG, JPEG or WebP image.');
  const { uploadMedia } = await import('@/lib/marketing/storage');
  return (await uploadMedia(bytes, { mime, prefix: `headshots/${ownerKey}` })).publicUrl;
}

/** One photo per person: the member profile and the admin avatar share it. */
export async function setMemberPhoto(email: string, url: string | null) {
  const result = await database().query('update public.members set photo_url=$2,updated_at=now() where email_normalized=$1 returning id', [email.trim().toLowerCase(), url ?? '']);
  return result.rowCount ? String(result.rows[0].id) : null;
}
