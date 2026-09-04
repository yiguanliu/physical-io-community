import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/api";
import { getPrisma } from "@/lib/outreach/prisma";

const memorySchema = z.object({
  title: z.string().trim().min(1),
  sourceName: z.string().trim().optional(),
  content: z.string().trim().min(1),
  tags: z.array(z.string().trim()).default([]),
  isActive: z.boolean().optional(),
});

function summarize(content: string) {
  return content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const prisma = getPrisma();
  const { id } = await context.params;
  const memoryDocument = await prisma.memoryDocument.findUniqueOrThrow({
    where: { id },
  });

  return NextResponse.json({ memoryDocument });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const prisma = getPrisma();
  const { id } = await context.params;
  const payload = memorySchema.parse(await request.json());

  const memoryDocument = await prisma.memoryDocument.update({
    where: { id },
    data: {
      title: payload.title,
      sourceName: payload.sourceName || payload.title,
      content: payload.content,
      summary: summarize(payload.content),
      tags: payload.tags.filter(Boolean),
      isActive: payload.isActive ?? true,
    },
  });

  return NextResponse.json({ memoryDocument });
}
