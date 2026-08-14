import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/outreach/prisma";

const memorySchema = z.object({
  title: z.string().trim().min(1),
  sourceName: z.string().trim().optional(),
  content: z.string().trim().min(1),
  tags: z.array(z.string().trim()).default([]),
});

function summarize(content: string) {
  return content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
}

export async function GET() {
  const prisma = getPrisma();
  const memoryDocuments = await prisma.memoryDocument.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });

  return NextResponse.json({ memoryDocuments });
}

export async function POST(request: Request) {
  const prisma = getPrisma();
  const payload = memorySchema.parse(await request.json());

  const memoryDocument = await prisma.memoryDocument.create({
    data: {
      title: payload.title,
      sourceName: payload.sourceName || payload.title,
      content: payload.content,
      summary: summarize(payload.content),
      tags: payload.tags.filter(Boolean),
    },
  });

  return NextResponse.json({ memoryDocument });
}
