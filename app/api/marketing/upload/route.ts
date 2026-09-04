import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { recordAsset } from "@/lib/admin/content-studio";
import { decodeDataUrl, uploadMedia } from "@/lib/marketing/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accepts a base64 data URL (from the draft image picker / crop tool or the
// visual studio canvas export) and stores it as a content asset.
const schema = z.object({
  itemId: z.string().optional(),
  dataUrl: z.string().startsWith("data:"),
  kind: z.enum(["upload", "ai_generated", "rendered"]).default("upload"),
  altText: z.string().max(400).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const body = schema.parse(await request.json());
  const decoded = decodeDataUrl(body.dataUrl);
  if (!decoded) return NextResponse.json({ error: "Invalid image data." }, { status: 400 });
  if (!decoded.mime.startsWith("image/")) return NextResponse.json({ error: "Not an image." }, { status: 400 });

  const media = await uploadMedia(decoded.bytes, { mime: decoded.mime, prefix: body.kind });
  const assetId = await recordAsset({
    contentItemId: body.itemId ?? null,
    kind: body.kind,
    storagePath: media.storagePath,
    publicUrl: media.publicUrl,
    mime: media.mime,
    width: body.width ?? null,
    height: body.height ?? null,
    altText: body.altText ?? "",
    createdByName: admin.name,
  });

  return NextResponse.json({ assetId, url: media.publicUrl });
}
