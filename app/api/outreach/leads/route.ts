import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/api";
import { getPrisma } from "@/lib/outreach/prisma";

const leadSchema = z.object({
  linkedinUrl: z.string().url().refine((value) => value.includes("linkedin.com/"), {
    message: "Use a LinkedIn profile URL.",
  }),
  fullName: z.string().trim().optional(),
  title: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  industryCategory: z.string().trim().min(1),
  category: z.string().trim().min(1),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  priority: z.coerce.number().int().min(1).max(3).default(2),
});

function inferredNameFromUrl(linkedinUrl: string) {
  const slug = linkedinUrl.split("/in/")[1]?.split(/[/?#]/)[0];

  if (!slug) {
    return null;
  }

  return slug
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function GET() {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const prisma = getPrisma();
  const leads = await prisma.lead.findMany({
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    include: {
      company: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const prisma = getPrisma();
  const payload = leadSchema.parse(await request.json());

  const company = payload.companyName
    ? await prisma.company.upsert({
        where: { name: payload.companyName },
        update: {
          industryCategory: payload.industryCategory,
        },
        create: {
          name: payload.companyName,
          industryCategory: payload.industryCategory,
        },
      })
    : null;

  const lead = await prisma.lead.upsert({
    where: { linkedinUrl: payload.linkedinUrl },
    update: {
      fullName: payload.fullName || inferredNameFromUrl(payload.linkedinUrl),
      title: payload.title || null,
      location: payload.location || null,
      category: payload.category,
      industryCategory: payload.industryCategory,
      priority: payload.priority,
      notes: payload.notes || null,
      companyId: company?.id ?? null,
    },
    create: {
      linkedinUrl: payload.linkedinUrl,
      fullName: payload.fullName || inferredNameFromUrl(payload.linkedinUrl),
      title: payload.title || null,
      location: payload.location || null,
      category: payload.category,
      industryCategory: payload.industryCategory,
      priority: payload.priority,
      notes: payload.notes || null,
      companyId: company?.id ?? null,
      stageHistory: {
        create: {
          toStage: "NEW_RESEARCH",
          note: "Lead created from LinkedIn URL.",
        },
      },
    },
    include: {
      company: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ lead });
}
