// Supabase Storage helpers for the Marketing Content Studio media bucket.
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { createId } from "@/lib/db/ids";
import { STORAGE_BUCKET } from "@/lib/marketing/config";

function extForMime(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "bin";
}

export type UploadedMedia = { storagePath: string; publicUrl: string; mime: string };

/** Upload raw bytes to the content-media bucket and return a public URL. */
export async function uploadMedia(
  bytes: Buffer | Uint8Array | ArrayBuffer,
  options: { mime?: string; prefix?: string } = {},
): Promise<UploadedMedia> {
  const sb = getSupabaseAdminClient();
  const mime = options.mime || "image/png";
  const path = `${options.prefix ?? "assets"}/${createId()}.${extForMime(mime)}`;
  const body = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;

  const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, body, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl, mime };
}

/** Decode a data URL (data:image/png;base64,....) into bytes + mime. */
export function decodeDataUrl(dataUrl: string): { bytes: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) return null;
  return { mime: match[1], bytes: Buffer.from(match[2], "base64") };
}

/** Fetch an external image URL and store it in the bucket (for internet-sourced images). */
export async function importFromUrl(sourceUrl: string): Promise<UploadedMedia & { width?: number; height?: number }> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Could not fetch image (${res.status}).`);
  const mime = res.headers.get("content-type") || "image/png";
  if (!mime.startsWith("image/")) throw new Error("That URL is not an image.");
  const buf = Buffer.from(await res.arrayBuffer());
  const uploaded = await uploadMedia(buf, { mime, prefix: "imported" });
  return uploaded;
}
