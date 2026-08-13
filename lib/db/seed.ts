import { count } from "drizzle-orm";
import { createId, createToken, nowIso } from "@/lib/db/ids";
import {
  auditLog,
  campaignEvents,
  campaignRecipients,
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

type Db = Awaited<ReturnType<typeof readyDb>>;

const sampleMembers = [
  {
    name: "Ava Oppenheimer",
    email: "ava@tryito.io",
    role: "Founder / Operator",
    city: "London",
    interests: ["Robotics", "AI/ML"],
    status: "active",
    subscribed: true,
  },
  {
    name: "Calvin Calica",
    email: "calvin@network.rca.ac.uk",
    role: "Designer",
    city: "London",
    interests: ["Industrial Design"],
    status: "active",
    subscribed: true,
  },
  {
    name: "Nora Chen",
    email: "nora@example.com",
    role: "Founder / Operator",
    city: "London",
    interests: ["AI/ML", "Marketing"],
    status: "review",
    subscribed: false,
  },
  {
    name: "Adam Klestil",
    email: "adam@example.com",
    role: "Designer",
    city: "Vienna",
    interests: ["UI/UX", "Research"],
    status: "active",
    subscribed: true,
  },
  {
    name: "Mina Park",
    email: "mina@example.com",
    role: "Researcher",
    city: "Cambridge",
    interests: ["Embodied AI"],
    status: "active",
    subscribed: true,
  },
  {
    name: "Leo Martins",
    email: "leo@example.com",
    role: "Engineer",
    city: "London",
    interests: ["Robotics", "Hardware"],
    status: "paused",
    subscribed: false,
  },
  {
    name: "Priya Shah",
    email: "priya@example.com",
    role: "Engineer",
    city: "London",
    interests: ["Computer Vision", "Robotics"],
    status: "active",
    subscribed: true,
  },
  {
    name: "James Hall",
    email: "james@example.com",
    role: "Researcher",
    city: "Manchester",
    interests: ["Spatial Intelligence"],
    status: "active",
    subscribed: true,
  },
];

export async function seedIfEmpty(db: Db) {
  const [{ total }] = await db.select({ total: count() }).from(members);
  if (Number(total) > 0) return;

  const timestamp = nowIso();
  const memberIds: string[] = [];

  for (const [index, sample] of sampleMembers.entries()) {
    const id = createId();
    memberIds.push(id);
    const signedUpAt = new Date(Date.UTC(2026, 5, 29 + (index % 6))).toISOString();
    await db.insert(members).values({
      id,
      email: sample.email,
      emailNormalized: sample.email.toLowerCase(),
      fullName: sample.name,
      firstName: sample.name.split(" ")[0],
      city: sample.city,
      professionalRole: sample.role,
      experienceRange: "3-7 years",
      status: sample.status,
      emailStatus: sample.subscribed ? "ok" : "ok",
      source: "seed",
      unsubscribeToken: createToken(),
      signedUpAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    if (sample.interests.length) {
      await db.insert(memberInterests).values(
        sample.interests.map((interest) => ({ id: createId(), memberId: id, interest })),
      );
    }
    await db.insert(subscriptions).values(
      (["newsletter", "events", "announcements"] as const).map((topic) => ({
        id: createId(),
        memberId: id,
        channel: "email",
        topic,
        status: sample.subscribed ? "subscribed" : "consent_unknown",
        consentAt: sample.subscribed ? signedUpAt : null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    );
  }

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

  const sentCampaignId = createId();
  await db.insert(campaigns).values({
    id: sentCampaignId,
    name: "July node spotlight",
    type: "newsletter",
    status: "sent",
    subject: "July in the Physical I/O community",
    previewText: "Demos, people, and what’s next.",
    body: "Hi {{first_name}},\n\nA short note on what the community built this month.",
    audienceFilter: JSON.stringify({ campaignType: "newsletter", requireConsent: true }),
    sentAt: "2026-07-24T09:00:00.000Z",
    createdByName: "System",
    idempotencyKey: createId(),
    recipientCount: 5,
    skipCount: 3,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const optedIn = sampleMembers
    .map((sample, index) => ({ sample, id: memberIds[index] }))
    .filter((item) => item.sample.subscribed);
  await db.insert(campaignRecipients).values(
    optedIn.map((item, index) => ({
      id: createId(),
      campaignId: sentCampaignId,
      memberId: item.id,
      email: item.sample.email,
      name: item.sample.name,
      status: index === 0 ? "opened" : "delivered",
      sentAt: "2026-07-24T09:01:00.000Z",
      openedAt: index === 0 ? "2026-07-24T10:12:00.000Z" : null,
      createdAt: timestamp,
    })),
  );
  await db.insert(campaignEvents).values({
    id: createId(),
    campaignId: sentCampaignId,
    type: "sent",
    payload: JSON.stringify({ provider: "seed" }),
    createdAt: "2026-07-24T09:01:00.000Z",
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

  await db.insert(auditLog).values({
    id: createId(),
    actorName: "System",
    action: "seed",
    entityType: "workspace",
    summary: "Loaded starter members, campaigns and outreach records",
  });
}
