import { count, eq } from "drizzle-orm";
import { EMAIL_TOPICS, INTEREST_KIND, firstNameFrom, parseMemberCsv } from "@/lib/admin/audience";
import { SIGNUP_RESPONSES_CSV } from "@/lib/db/fixtures/signup-responses";
import { createId, createToken, nowIso } from "@/lib/db/ids";
import {
  auditLog,
  campaigns,
  communityEvents,
  contacts,
  leadActivities,
  leads,
  memberInterests,
  members,
  organisations,
  outreachMessages,
  subscriptions,
} from "@/lib/db/schema";
import type { readyDb } from "@/lib/db/client";
import type { ParsedMemberRow } from "@/lib/admin/audience";

type Db = Awaited<ReturnType<typeof readyDb>>;

async function insertParsedMember(db: Db, row: ParsedMemberRow, source: string) {
  const id = createId();
  const timestamp = nowIso();
  await db.insert(members).values({
    id,
    email: row.email,
    emailNormalized: row.email,
    fullName: row.fullName,
    firstName: firstNameFrom(row.fullName),
    city: row.city,
    professionalRole: row.professionalRole,
    experienceRange: row.experienceRange,
    websiteUrl: row.websiteUrl,
    linkedinUrl: row.linkedinUrl,
    suggestions: row.suggestions,
    status: "active",
    emailStatus: "ok",
    source,
    sourceRow: row.sourceRow ?? null,
    unsubscribeToken: createToken(),
    signedUpAt: row.signedUpAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const tags = [
    ...row.interests.map((interest) => ({ kind: INTEREST_KIND.workArea, interest })),
    ...row.communityGoals.map((interest) => ({ kind: INTEREST_KIND.communityGoal, interest })),
    ...row.eventFormats.map((interest) => ({ kind: INTEREST_KIND.eventFormat, interest })),
  ];
  if (tags.length) {
    await db.insert(memberInterests).values(tags.map((tag) => ({ id: createId(), memberId: id, ...tag })));
  }
  await db.insert(subscriptions).values(
    EMAIL_TOPICS.map((topic) => ({
      id: createId(),
      memberId: id,
      channel: "email",
      topic,
      status: "consent_unknown" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  );
  return id;
}

async function ensureSignupMembers(db: Db) {
  const [{ total }] = await db.select({ total: count() }).from(members).where(eq(members.source, "google_form"));
  if (Number(total) > 0) return;

  const seedRows = await db.select({ id: members.id }).from(members).where(eq(members.source, "seed"));
  for (const row of seedRows) {
    await db.delete(members).where(eq(members.id, row.id));
  }

  const parsed = parseMemberCsv(SIGNUP_RESPONSES_CSV);
  let imported = 0;
  for (const row of parsed.rows) {
    const [existing] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.emailNormalized, row.email))
      .limit(1);
    if (existing) continue;
    await insertParsedMember(db, row, "google_form");
    imported += 1;
  }

  await db.insert(auditLog).values({
    id: createId(),
    actorName: "System",
    action: "import",
    entityType: "member",
    summary: `Imported ${imported} members from Google Form signup responses${parsed.errors.length ? ` (${parsed.errors.length} rows skipped)` : ""}`,
  });
}

async function seedWorkspaceIfEmpty(db: Db) {
  const [{ campaignCount }] = await db.select({ campaignCount: count() }).from(campaigns);
  if (Number(campaignCount) > 0) return;

  const timestamp = nowIso();
  const eventId = createId();
  await db.insert(communityEvents).values({
    id: eventId,
    title: "Physical I/O: Manifesto",
    description: "Community launch, manifesto talk, expert panel and live Q&A.",
    venue: "Online",
    startsAt: "2026-08-20T17:00:00.000Z",
    status: "published",
    registrationUrl: "https://www.physical-io.com",
    registeredCount: 184,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await db.insert(campaigns).values({
    id: createId(),
    name: "August community update",
    type: "newsletter",
    status: "draft",
    subject: "August community update",
    previewText: "What’s on this month.",
    body: "Hi {{first_name}},\n\nHere’s what’s happening across Physical I/O this month.",
    audienceFilter: JSON.stringify({ campaignType: "newsletter", requireConsent: true }),
    createdByName: "System",
    idempotencyKey: createId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await db.insert(campaigns).values({
    id: createId(),
    name: "Manifesto event reminder",
    type: "event_update",
    status: "draft",
    subject: "Reminder: Physical I/O Manifesto on 20 August",
    previewText: "Join us online at 18:00 BST.",
    body: "Hi {{first_name}},\n\nThis is a reminder that Manifesto is on 20 August.",
    audienceFilter: JSON.stringify({ campaignType: "event_update", requireConsent: true }),
    eventId,
    createdByName: "System",
    idempotencyKey: createId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const leadSeeds = [
    { company: "Nothing", contact: "Maya Chen", email: "maya@example.com", role: "Partnerships Director", status: "meeting", value: 12000, score: 92, next: "Meet · Thu 11:30" },
    { company: "Wayve", contact: "Sam Robertson", email: "sam@example.com", role: "Community & Events", status: "contacted", value: 8000, score: 86, next: "Follow up · Tomorrow" },
    { company: "NVIDIA", contact: "Elena Rossi", email: "elena@example.com", role: "Developer Relations", status: "proposal", value: 20000, score: 89, next: "Review proposal · Fri" },
    { company: "Foster + Partners", contact: "James Hall", email: "james.hall@example.com", role: "Applied R&D Lead", status: "research", value: 6000, score: 74, next: "Complete research" },
  ];

  for (const seed of leadSeeds) {
    const organisationId = createId();
    const contactId = createId();
    const leadId = createId();
    await db.insert(organisations).values({
      id: organisationId,
      name: seed.company,
      website: `https://${seed.company.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
      industry: "Physical AI",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await db.insert(contacts).values({
      id: contactId,
      organisationId,
      name: seed.contact,
      email: seed.email,
      role: seed.role,
      createdAt: timestamp,
    });
    await db.insert(leads).values({
      id: leadId,
      organisationId,
      contactId,
      status: seed.status,
      fitScore: seed.score,
      estimatedValueGbp: seed.value,
      ownerName: "Anthony Liu",
      nextAction: seed.next,
      lastActivityAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await db.insert(leadActivities).values({
      id: createId(),
      leadId,
      type: "note",
      title: "Lead imported from seed data",
      detail: "Replace this record when real outreach starts.",
      createdByName: "System",
    });
    if (seed.status !== "research") {
      await db.insert(outreachMessages).values({
        id: createId(),
        leadId,
        status: "sent",
        subject: `${seed.company} × Physical I/O`,
        body: `Hi ${seed.contact.split(" ")[0]},\n\nI'd love to explore a partnership with ${seed.company}.`,
        toEmail: seed.email,
        toName: seed.contact,
        sentAt: timestamp,
        createdByName: "System",
      });
    }
  }
}

export async function seedIfEmpty(db: Db) {
  await ensureSignupMembers(db);
  await seedWorkspaceIfEmpty(db);
}
