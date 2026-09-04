import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { discoverNews } from "@/lib/marketing/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ steer: z.string().trim().max(500).optional() });

export async function POST(request: Request) {
  await requireAdmin();
  const body = schema.parse(await request.json().catch(() => ({})));
  const { candidates, provider } = await discoverNews(body.steer);
  return NextResponse.json({ candidates, provider });
}
