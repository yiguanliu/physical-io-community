import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { recordAsset, upsertVariant } from "@/lib/admin/content-studio";
import { decodeDataUrl, uploadMedia } from "@/lib/marketing/storage";
import { isPlatform } from "@/lib/marketing/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rasterised export from the visual studio canvas: store the rendered graphic
// and link it to the platform variant.
const schema = z.object({
  itemId: z.string(),
  platform: z.string(),
  dataUrl: z.string().startsWith("data:"),
  renderConfig: z.record(z.string(), z.any()).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const body = schema.parse(await request.json());
  if (!isPlatform(body.platform)) return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
  const decoded = decodeDataUrl(body.dataUrl);
  if (!decoded) return NextResponse.json({ error: "Invalid image data." }, { status: 400 });

  const media = await uploadMedia(decoded.bytes, { mime: decoded.mime, prefix: "rendered" });
  const assetId = await recordAsset({
    contentItemId: body.itemId,
    kind: "rendered",
    storagePath: media.storagePath,
    publicUrl: media.publicUrl,
    mime: media.mime,
    width: body.width ?? null,
    height: body.height ?? null,
    createdByName: admin.name,
  });
  await upsertVariant(body.itemId, body.platform, {
    renderedAssetId: assetId,
    renderConfig: body.renderConfig ?? {},
  });

  return NextResponse.json({ assetId, url: media.publicUrl });
}
