import { NextResponse } from "next/server";
import { z } from "zod";
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = getPrisma();
  const { id } = await context.params;
  const payload = senderPersonaSchema.parse(await request.json());

  const senderPersona = await prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.senderPersona.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return tx.senderPersona.update({
      where: { id },
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
