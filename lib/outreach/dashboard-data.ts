import { getPrisma } from "@/lib/outreach/prisma";

export async function getDashboardData() {
  try {
    const prisma = getPrisma();
    const [leads, templates, memoryDocuments, senderPersonas] = await Promise.all([
      prisma.lead.findMany({
        orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
        include: {
          company: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.outreachTemplate.findMany({
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      }),
      prisma.memoryDocument.findMany({
        orderBy: [{ updatedAt: "desc" }],
      }),
      prisma.senderPersona.findMany({
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      }),
    ]);

    return {
      dbReady: true,
      error: null,
      leads: JSON.parse(JSON.stringify(leads)),
      templates: JSON.parse(JSON.stringify(templates)),
      memoryDocuments: JSON.parse(JSON.stringify(memoryDocuments)),
      senderPersonas: JSON.parse(JSON.stringify(senderPersonas)),
    };
  } catch (error) {
    return {
      dbReady: false,
      error: error instanceof Error ? error.message : "Database unavailable.",
      leads: [],
      templates: [],
      memoryDocuments: [],
      senderPersonas: [],
    };
  }
}
