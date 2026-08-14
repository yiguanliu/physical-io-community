import { NextResponse } from "next/server";
import { z } from "zod";
import { outreachTypes } from "@/lib/outreach/outreach-config";
import { generateDraft } from "@/lib/outreach/drafting";
import { rankMemoryDocuments } from "@/lib/outreach/memory";
import { getPrisma } from "@/lib/outreach/prisma";

const draftSchema = z.object({
  leadId: z.string().min(1),
  type: z.enum(outreachTypes.map((type) => type.value)),
  tone: z.string().trim().min(1).default("warm"),
  outputLength: z.enum(["concise", "medium", "detailed"]).default("medium"),
  templateId: z.string().optional(),
  senderPersonaId: z.string().optional().nullable(),
  customContext: z.string().trim().max(2_000).optional(),
  memoryDocumentIds: z.array(z.string().min(1)).max(8).default([]),
});

export async function POST(request: Request) {
  const prisma = getPrisma();
  const payload = draftSchema.parse(await request.json());

  const [lead, template, memoryDocuments, senderPersona] = await Promise.all([
    prisma.lead.findUniqueOrThrow({
      where: { id: payload.leadId },
      include: {
        company: true,
      },
    }),
    payload.templateId
      ? prisma.outreachTemplate.findUnique({
          where: { id: payload.templateId },
        })
      : prisma.outreachTemplate.findFirst({
          where: { type: payload.type, isDefault: true },
        }),
    prisma.memoryDocument.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
    payload.senderPersonaId
      ? prisma.senderPersona.findFirst({
          where: { id: payload.senderPersonaId, isActive: true },
        })
      : null,
  ]);

  const attachedMemoryIds = new Set(payload.memoryDocumentIds);
  const attachedMemoryDocuments = memoryDocuments.filter((document) => attachedMemoryIds.has(document.id));
  const rankedMemory = rankMemoryDocuments(
    {
      type: payload.type,
      tone: payload.tone,
      customContext: payload.customContext,
      lead,
      template,
    },
    memoryDocuments.filter((document) => !attachedMemoryIds.has(document.id)),
  );
  const sourceMemory = attachedMemoryDocuments.map((document) => ({
    id: document.id,
    title: document.title,
    sourceName: document.sourceName,
    tags: document.tags,
    source: "attached" as const,
    snippet: document.content.slice(0, 6_000),
  }));

  const draft = await generateDraft({
    type: payload.type,
    tone: payload.tone,
    outputLength: payload.outputLength,
    customContext: payload.customContext,
    template,
    senderPersona,
    memoryDocuments: [...sourceMemory, ...rankedMemory],
    lead,
  });

  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.outreachMessage.create({
      data: {
        leadId: payload.leadId,
        type: payload.type,
        tone: payload.tone,
        subject: draft.subject,
        body: draft.body,
        status: draft.provider === "openai" ? "draft_openai" : "draft_local",
      },
    });

    const updatedLead = await tx.lead.update({
      where: { id: payload.leadId },
      data: {
        stage: lead.stage === "NEW_RESEARCH" ? "DRAFTED" : lead.stage,
      },
      include: {
        company: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (lead.stage === "NEW_RESEARCH") {
      await tx.stageHistory.create({
        data: {
          leadId: payload.leadId,
          fromStage: "NEW_RESEARCH",
          toStage: "DRAFTED",
          note: "Draft generated.",
        },
      });
    }

    return { message, lead: updatedLead };
  });

  return NextResponse.json(result);
}
