import { NextResponse } from "next/server";
import { z } from "zod";
import { outreachStages } from "@/lib/outreach/outreach-config";
import { getPrisma } from "@/lib/outreach/prisma";

const updateLeadSchema = z.object({
  stage: z.enum(outreachStages.map((stage) => stage.value)).optional(),
  note: z.string().trim().optional(),
  linkedinUrl: z
    .string()
    .url()
    .refine((value) => value.includes("linkedin.com/"), {
      message: "Use a LinkedIn profile URL.",
    })
    .optional(),
  fullName: z.string().trim().optional(),
  title: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  industryCategory: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = getPrisma();
  const { id } = await context.params;
  const payload = updateLeadSchema.parse(await request.json());

  const current = await prisma.lead.findUniqueOrThrow({
    where: { id },
    select: { stage: true },
  });

  const company =
    payload.companyName === undefined
      ? undefined
      : payload.companyName
        ? await prisma.company.upsert({
            where: { name: payload.companyName },
            update: {
              industryCategory: payload.industryCategory ?? undefined,
            },
            create: {
              name: payload.companyName,
              industryCategory: payload.industryCategory ?? "Physical AI",
            },
          })
        : null;

  const lead = await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: {
        linkedinUrl: payload.linkedinUrl,
        fullName: payload.fullName,
        title: payload.title === undefined ? undefined : payload.title || null,
        location: payload.location === undefined ? undefined : payload.location || null,
        category: payload.category,
        industryCategory: payload.industryCategory,
        priority: payload.priority,
        notes: payload.notes === undefined ? undefined : payload.notes || null,
        companyId: company === undefined ? undefined : company?.id ?? null,
        stage: payload.stage,
        lastContactedAt: payload.stage === "SENT" ? new Date() : undefined,
      },
      include: {
        company: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (payload.stage && current.stage !== payload.stage) {
      await tx.stageHistory.create({
        data: {
          leadId: id,
          fromStage: current.stage,
          toStage: payload.stage,
          note: payload.note || null,
        },
      });
    }

    return updated;
  });

  return NextResponse.json({ lead });
}
