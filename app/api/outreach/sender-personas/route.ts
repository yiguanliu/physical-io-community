import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/api";
import { getPrisma } from "@/lib/outreach/prisma";

const senderPersonaSchema = z.object({
  fullName: z.string().trim().min(1),
  roleTitle: z.string().trim().min(1),
  organization: z.string().trim().min(1).default("Physical.IO"),
  linkedinUrl: z.string().trim().url().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  introduction: z.string().trim().min(1),
  personaDetails: z.string().trim().optional(),
  personalConnectionGuidance: z.string().trim().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const prisma = getPrisma();
  const senderPersonas = await prisma.senderPersona.findMany({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ senderPersonas });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const prisma = getPrisma();
  const payload = senderPersonaSchema.parse(await request.json());

  const senderPersona = await prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.senderPersona.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.senderPersona.create({
      data: {
        fullName: payload.fullName,
        roleTitle: payload.roleTitle,
        organization: payload.organization,
        linkedinUrl: payload.linkedinUrl || null,
        email: payload.email || null,
        introduction: payload.introduction,
        personaDetails: payload.personaDetails || "",
        personalConnectionGuidance: payload.personalConnectionGuidance || "",
        isDefault: payload.isDefault,
        isActive: payload.isActive,
      },
    });
  });

  return NextResponse.json({ senderPersona });
}
