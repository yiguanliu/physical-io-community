import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/api";
import { outreachTypes } from "@/lib/outreach/outreach-config";
import { getPrisma } from "@/lib/outreach/prisma";

const templateSchema = z.object({
  type: z.enum(outreachTypes.map((type) => type.value)),
  label: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  context: z.string().trim().optional(),
});

export async function GET() {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const prisma = getPrisma();
  const templates = await prisma.outreachTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const prisma = getPrisma();
  const payload = templateSchema.parse(await request.json());

  const template = await prisma.outreachTemplate.create({
    data: {
      type: payload.type,
      label: payload.label,
      prompt: payload.prompt,
      context: payload.context || "",
    },
  });

  return NextResponse.json({ template });
}
