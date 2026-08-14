import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  EMAIL_TOPICS,
  INTEREST_KIND,
  firstNameFrom,
  normalizeEmail,
  parseAudienceFilter,
  type AudienceFilter,
  type AudienceMember,
  type InterestKind,
  type ParsedMemberRow,
} from "@/lib/admin/audience";
import { createId, createToken, nowIso } from "@/lib/db/ids";
import { readyDb } from "@/lib/db/client";
import { auditLog, campaignEvents, campaignRecipients, campaigns, communityEvents, contacts, leadActivities, leads, memberInterests, members, organisations, outreachMessages, subscriptions } from "@/lib/db/schema";

export type Db = Awaited<ReturnType<typeof readyDb>>;

export async function writeAudit(input: {
  actorUserId?: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
}) {
  const db = await readyDb();
  await db.insert(auditLog).values({
    id: createId(),
    actorUserId: input.actorUserId ?? null,
    actorName: input.actorName,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary,
  });
}

async function defaultSubscriptions(db: Db, memberId: string, status: "subscribed" | "consent_unknown") {
  const timestamp = nowIso();
  await db.insert(subscriptions).values(
    EMAIL_TOPICS.map((topic) => ({
      id: createId(),
      memberId,
      channel: "email",
      topic,
      status,
      consentAt: status === "subscribed" ? timestamp : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  );
}

export async function listMembers(params: { query?: string; status?: string; city?: string; limit?: number } = {}) {
  const db = await readyDb();
  const filters = [];
  if (params.query?.trim()) {
    const needle = `%${params.query.trim().toLowerCase()}%`;
    filters.push(
      or(
        sql`lower(${members.fullName}) like ${needle}`,
        sql`lower(${members.email}) like ${needle}`,
        sql`lower(${members.city}) like ${needle}`,
        sql`lower(${members.professionalRole}) like ${needle}`,
      ),
    );
  }
  if (params.status && params.status !== "all") filters.push(eq(members.status, params.status));
  if (params.city && params.city !== "all") filters.push(eq(members.city, params.city));
  const where = filters.length ? and(...filters) : undefined;
  const rows = await db
    .select()
    .from(members)
    .where(where)
    .orderBy(desc(members.signedUpAt))
    .limit(params.limit ?? 500);
  const ids = rows.map((row) => row.id);
  const interestRows = ids.length ? await db.select().from(memberInterests).where(inArray(memberInterests.memberId, ids)) : [];
  const subscriptionRows = ids.length ? await db.select().from(subscriptions).where(inArray(subscriptions.memberId, ids)) : [];
  const [{ total }] = await db.select({ total: count() }).from(members);
  const cities = await db.selectDistinct({ city: members.city }).from(members);
  return {
    members: rows.map((row) => ({
      ...row,
      ...interestsForMember(interestRows, row.id),
      subscriptions: subscriptionRows.filter((item) => item.memberId === row.id),
    })),
    total: Number(total),
    cities: cities.map((item) => item.city).filter(Boolean).sort(),
  };
}

export async function getMember(id: string) {
  const db = await readyDb();
  const [member] = await db.select().from(members).where(eq(members.id, id)).limit(1);
  if (!member) return null;
  const interests = await db.select().from(memberInterests).where(eq(memberInterests.memberId, id));
  const memberSubscriptions = await db.select().from(subscriptions).where(eq(subscriptions.memberId, id));
  return { ...member, ...interestsForMember(interests, id), subscriptions: memberSubscriptions };
}

function interestsForMember(rows: Array<{ memberId: string; kind?: string | null; interest: string }>, memberId: string) {
  const items = rows.filter((item) => item.memberId === memberId);
  const ofKind = (kind: InterestKind) =>
    items.filter((item) => (item.kind || INTEREST_KIND.workArea) === kind).map((item) => item.interest);
  return {
    interests: ofKind(INTEREST_KIND.workArea),
    communityGoals: ofKind(INTEREST_KIND.communityGoal),
    eventFormats: ofKind(INTEREST_KIND.eventFormat),
  };
}

async function replaceInterests(db: Db, memberId: string, kind: InterestKind, values: string[]) {
  await db.delete(memberInterests).where(and(eq(memberInterests.memberId, memberId), eq(memberInterests.kind, kind)));
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (!unique.length) return;
  await db.insert(memberInterests).values(
    unique.map((interest) => ({ id: createId(), memberId, kind, interest })),
  );
}

export async function getAllAudienceMembers(): Promise<AudienceMember[]> {
  const listed = await listMembers({ limit: 5000 });
  return listed.members.map((member) => ({
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    firstName: member.firstName,
    city: member.city,
    professionalRole: member.professionalRole,
    status: member.status,
    emailStatus: member.emailStatus,
    interests: member.interests,
    subscriptions: member.subscriptions.map((item) => ({ topic: item.topic, status: item.status })),
  }));
}

export async function upsertMember(
  input: {
    id?: string;
    email: string;
    fullName: string;
    city?: string;
    professionalRole?: string;
    experienceRange?: string;
    websiteUrl?: string;
    linkedinUrl?: string;
    suggestions?: string;
    status?: string;
    notes?: string;
    interests?: string[];
    communityGoals?: string[];
    eventFormats?: string[];
    source?: string;
    sourceRow?: string;
    signedUpAt?: string;
    newsletterConsent?: boolean;
  },
  actor: { id?: string; name: string },
) {
  const db = await readyDb();
  const emailNormalized = normalizeEmail(input.email);
  const timestamp = nowIso();
  const existing = input.id
    ? await getMember(input.id)
    : (await db.select().from(members).where(eq(members.emailNormalized, emailNormalized)).limit(1))[0];
  const id = existing?.id ?? createId();
  const values = {
    email: input.email.trim(),
    emailNormalized,
    fullName: input.fullName.trim(),
    firstName: firstNameFrom(input.fullName),
    city: input.city?.trim() ?? existing?.city ?? "",
    professionalRole: input.professionalRole?.trim() ?? existing?.professionalRole ?? "",
    experienceRange: input.experienceRange?.trim() ?? existing?.experienceRange ?? "",
    websiteUrl: input.websiteUrl?.trim() ?? existing?.websiteUrl ?? "",
    linkedinUrl: input.linkedinUrl?.trim() ?? existing?.linkedinUrl ?? "",
    suggestions: input.suggestions?.trim() ?? existing?.suggestions ?? "",
    status: input.status ?? existing?.status ?? "active",
    notes: input.notes ?? existing?.notes ?? "",
    source: input.source ?? existing?.source ?? "manual",
    sourceRow: input.sourceRow ?? existing?.sourceRow ?? null,
    signedUpAt: input.signedUpAt ?? existing?.signedUpAt ?? timestamp,
    updatedAt: timestamp,
  };
  if (existing) {
    await db.update(members).set(values).where(eq(members.id, id));
  } else {
    await db.insert(members).values({
      id,
      unsubscribeToken: createToken(),
      emailStatus: "ok",
      createdAt: timestamp,
      ...values,
    });
    await defaultSubscriptions(db, id, input.newsletterConsent ? "subscribed" : "consent_unknown");
  }
  if (input.interests) await replaceInterests(db, id, INTEREST_KIND.workArea, input.interests);
  if (input.communityGoals) await replaceInterests(db, id, INTEREST_KIND.communityGoal, input.communityGoals);
  if (input.eventFormats) await replaceInterests(db, id, INTEREST_KIND.eventFormat, input.eventFormats);
  if (typeof input.newsletterConsent === "boolean" && existing) {
    await db
      .update(subscriptions)
      .set({
        status: input.newsletterConsent ? "subscribed" : "unsubscribed",
        consentAt: input.newsletterConsent ? timestamp : null,
        unsubscribedAt: input.newsletterConsent ? null : timestamp,
        updatedAt: timestamp,
      })
      .where(and(eq(subscriptions.memberId, id), eq(subscriptions.topic, "newsletter")));
  }
  await writeAudit({
    actorUserId: actor.id,
    actorName: actor.name,
    action: existing ? "member.update" : "member.create",
    entityType: "member",
    entityId: id,
    summary: `${existing ? "Updated" : "Created"} ${values.fullName} <${emailNormalized}>`,
  });
  return id;
}

export async function importMemberRows(
  rows: ParsedMemberRow[],
  actor: { id?: string; name: string },
  options: { source?: string } = {},
) {
  let created = 0;
  let updated = 0;
  const rejected: string[] = [];
  for (const row of rows) {
    try {
      const db = await readyDb();
      const existing = await db.select({ id: members.id }).from(members).where(eq(members.emailNormalized, row.email)).limit(1);
      await upsertMember(
        {
          email: row.email,
          fullName: row.fullName,
          city: row.city,
          professionalRole: row.professionalRole,
          experienceRange: row.experienceRange,
          websiteUrl: row.websiteUrl,
          linkedinUrl: row.linkedinUrl,
          suggestions: row.suggestions,
          interests: row.interests,
          communityGoals: row.communityGoals,
          eventFormats: row.eventFormats,
          source: options.source ?? "csv",
          sourceRow: row.sourceRow,
          signedUpAt: row.signedUpAt,
        },
        actor,
      );
      if (existing[0]) updated += 1;
      else created += 1;
    } catch (error) {
      rejected.push(`${row.email}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  return { created, updated, rejected };
}

export async function setMemberSubscription(memberId: string, topic: string, status: "subscribed" | "unsubscribed" | "consent_unknown") {
  const db = await readyDb();
  const timestamp = nowIso();
  await db
    .update(subscriptions)
    .set({
      status,
      consentAt: status === "subscribed" ? timestamp : null,
      unsubscribedAt: status === "unsubscribed" ? timestamp : null,
      updatedAt: timestamp,
    })
    .where(and(eq(subscriptions.memberId, memberId), eq(subscriptions.topic, topic)));
  if (status === "unsubscribed" && topic === "newsletter") {
    await db.update(members).set({ emailStatus: "unsubscribed", updatedAt: timestamp }).where(eq(members.id, memberId));
  }
}

export async function unsubscribeByToken(token: string) {
  const db = await readyDb();
  const [member] = await db.select().from(members).where(eq(members.unsubscribeToken, token)).limit(1);
  if (!member) return null;
  const timestamp = nowIso();
  await db.update(members).set({ emailStatus: "unsubscribed", updatedAt: timestamp }).where(eq(members.id, member.id));
  await db
    .update(subscriptions)
    .set({ status: "unsubscribed", unsubscribedAt: timestamp, updatedAt: timestamp })
    .where(eq(subscriptions.memberId, member.id));
  return member;
}

export async function listCampaigns() {
  const db = await readyDb();
  return db.select().from(campaigns).orderBy(desc(campaigns.updatedAt));
}

export async function getCampaign(id: string) {
  const db = await readyDb();
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!campaign) return null;
  const recipients = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, id))
    .orderBy(desc(campaignRecipients.createdAt));
  const events = await db.select().from(campaignEvents).where(eq(campaignEvents.campaignId, id)).orderBy(desc(campaignEvents.createdAt));
  return { ...campaign, audience: parseAudienceFilter(campaign.audienceFilter), recipients, events };
}

export async function saveCampaign(input: {
  id?: string;
  name: string;
  type: string;
  subject: string;
  previewText?: string;
  fromName?: string;
  replyTo?: string;
  body: string;
  audienceFilter?: AudienceFilter;
  eventId?: string | null;
}, actor: { id?: string; name: string }) {
  const db = await readyDb();
  const timestamp = nowIso();
  const id = input.id ?? createId();
  const [existing] = input.id ? await db.select().from(campaigns).where(eq(campaigns.id, input.id)).limit(1) : [];
  if (existing && !["draft", "failed"].includes(existing.status)) {
    throw new Error("Only draft campaigns can be edited.");
  }
  const values = {
    name: input.name.trim(),
    type: input.type,
    subject: input.subject.trim(),
    previewText: input.previewText?.trim() ?? "",
    fromName: input.fromName?.trim() || "Physical I/O",
    replyTo: input.replyTo?.trim() ?? "",
    body: input.body,
    audienceFilter: JSON.stringify(input.audienceFilter ?? { campaignType: input.type, requireConsent: true }),
    eventId: input.eventId ?? null,
    updatedAt: timestamp,
    createdByUserId: actor.id ?? null,
    createdByName: actor.name,
  };
  if (existing) {
    await db.update(campaigns).set(values).where(eq(campaigns.id, id));
  } else {
    await db.insert(campaigns).values({
      id,
      status: "draft",
      idempotencyKey: createId(),
      createdAt: timestamp,
      ...values,
    });
  }
  await writeAudit({
    actorUserId: actor.id,
    actorName: actor.name,
    action: existing ? "campaign.update" : "campaign.create",
    entityType: "campaign",
    entityId: id,
    summary: `${existing ? "Updated" : "Created"} campaign ${values.name}`,
  });
  return id;
}

export async function listOutreach() {
  const db = await readyDb();
  const rows = await db
    .select({
      lead: leads,
      organisation: organisations,
      contact: contacts,
    })
    .from(leads)
    .innerJoin(organisations, eq(leads.organisationId, organisations.id))
    .leftJoin(contacts, eq(leads.contactId, contacts.id))
    .orderBy(desc(leads.updatedAt));
  return rows.map((row) => ({
    ...row.lead,
    company: row.organisation.name,
    website: row.organisation.website,
    industry: row.organisation.industry,
    contactName: row.contact?.name ?? "",
    contactEmail: row.contact?.email ?? "",
    contactRole: row.contact?.role ?? "",
  }));
}

export async function getLead(id: string) {
  const db = await readyDb();
  const [row] = await db
    .select({ lead: leads, organisation: organisations, contact: contacts })
    .from(leads)
    .innerJoin(organisations, eq(leads.organisationId, organisations.id))
    .leftJoin(contacts, eq(leads.contactId, contacts.id))
    .where(eq(leads.id, id))
    .limit(1);
  if (!row) return null;
  const activities = await db.select().from(leadActivities).where(eq(leadActivities.leadId, id)).orderBy(desc(leadActivities.createdAt));
  const messages = await db.select().from(outreachMessages).where(eq(outreachMessages.leadId, id)).orderBy(desc(outreachMessages.createdAt));
  return {
    ...row.lead,
    company: row.organisation.name,
    website: row.organisation.website,
    industry: row.organisation.industry,
    orgNotes: row.organisation.notes,
    contactName: row.contact?.name ?? "",
    contactEmail: row.contact?.email ?? "",
    contactRole: row.contact?.role ?? "",
    activities,
    messages,
  };
}

export async function createLead(input: {
  company: string;
  website?: string;
  industry?: string;
  contactName: string;
  contactEmail: string;
  contactRole?: string;
  status?: string;
  fitScore?: number;
  estimatedValueGbp?: number;
  nextAction?: string;
}, actor: { id?: string; name: string }) {
  const db = await readyDb();
  const timestamp = nowIso();
  const organisationId = createId();
  const contactId = createId();
  const leadId = createId();
  await db.insert(organisations).values({
    id: organisationId,
    name: input.company.trim(),
    website: input.website?.trim() ?? "",
    industry: input.industry?.trim() ?? "",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await db.insert(contacts).values({
    id: contactId,
    organisationId,
    name: input.contactName.trim(),
    email: input.contactEmail.trim(),
    role: input.contactRole?.trim() ?? "",
    createdAt: timestamp,
  });
  await db.insert(leads).values({
    id: leadId,
    organisationId,
    contactId,
    status: input.status ?? "research",
    fitScore: input.fitScore ?? 50,
    estimatedValueGbp: input.estimatedValueGbp ?? 0,
    ownerName: actor.name,
    nextAction: input.nextAction ?? "Research the organisation",
    lastActivityAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await db.insert(leadActivities).values({
    id: createId(),
    leadId,
    type: "status",
    title: "Lead created",
    detail: `Assigned to ${actor.name}`,
    createdByName: actor.name,
  });
  await writeAudit({
    actorUserId: actor.id,
    actorName: actor.name,
    action: "lead.create",
    entityType: "lead",
    entityId: leadId,
    summary: `Created lead ${input.company}`,
  });
  return leadId;
}

export async function updateLeadStatus(leadId: string, status: string, actor: { name: string; id?: string }) {
  const db = await readyDb();
  const timestamp = nowIso();
  await db.update(leads).set({ status, updatedAt: timestamp, lastActivityAt: timestamp }).where(eq(leads.id, leadId));
  await db.insert(leadActivities).values({
    id: createId(),
    leadId,
    type: "status",
    title: `Status moved to ${status}`,
    createdByName: actor.name,
  });
}

export async function addLeadNote(leadId: string, note: string, actor: { name: string; id?: string }) {
  const db = await readyDb();
  const timestamp = nowIso();
  await db.insert(leadActivities).values({
    id: createId(),
    leadId,
    type: "note",
    title: "Internal note",
    detail: note.trim(),
    createdByName: actor.name,
  });
  await db.update(leads).set({ updatedAt: timestamp, lastActivityAt: timestamp }).where(eq(leads.id, leadId));
}

export async function completeNextAction(leadId: string, actor: { name: string }) {
  const db = await readyDb();
  const timestamp = nowIso();
  await db.update(leads).set({ nextAction: "", nextActionAt: null, updatedAt: timestamp, lastActivityAt: timestamp }).where(eq(leads.id, leadId));
  await db.insert(leadActivities).values({
    id: createId(),
    leadId,
    type: "task",
    title: "Next action completed",
    createdByName: actor.name,
  });
}

export async function saveOutreachDraft(input: {
  leadId: string;
  subject: string;
  body: string;
  toEmail: string;
  toName: string;
}, actor: { name: string; id?: string }) {
  const db = await readyDb();
  const id = createId();
  await db.insert(outreachMessages).values({
    id,
    leadId: input.leadId,
    status: "draft",
    subject: input.subject.trim(),
    body: input.body,
    toEmail: input.toEmail.trim(),
    toName: input.toName.trim(),
    createdByName: actor.name,
  });
  return id;
}

export async function listEvents() {
  const db = await readyDb();
  return db.select().from(communityEvents).orderBy(desc(communityEvents.startsAt));
}

export async function saveEvent(input: {
  id?: string;
  title: string;
  description?: string;
  venue?: string;
  startsAt: string;
  status?: string;
  registrationUrl?: string;
  registeredCount?: number;
}) {
  const db = await readyDb();
  const timestamp = nowIso();
  const id = input.id ?? createId();
  const values = {
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    venue: input.venue?.trim() ?? "",
    startsAt: input.startsAt,
    status: input.status ?? "draft",
    registrationUrl: input.registrationUrl?.trim() ?? "",
    registeredCount: input.registeredCount ?? 0,
    updatedAt: timestamp,
  };
  const [existing] = input.id ? await db.select().from(communityEvents).where(eq(communityEvents.id, input.id)).limit(1) : [];
  if (existing) await db.update(communityEvents).set(values).where(eq(communityEvents.id, id));
  else await db.insert(communityEvents).values({ id, createdAt: timestamp, ...values });
  return id;
}

export async function overviewStats() {
  const db = await readyDb();
  const [{ memberCount }] = await db.select({ memberCount: count() }).from(members);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ weekCount }] = await db.select({ weekCount: count() }).from(members).where(sql`${members.signedUpAt} >= ${weekAgo}`);
  const [{ monthCount }] = await db.select({ monthCount: count() }).from(members).where(sql`${members.signedUpAt} >= ${monthAgo}`);
  const [{ subscribed }] = await db
    .select({ subscribed: count() })
    .from(subscriptions)
    .where(and(eq(subscriptions.topic, "newsletter"), eq(subscriptions.status, "subscribed")));
  const [{ leadCount }] = await db.select({ leadCount: count() }).from(leads).where(sql`${leads.status} not in ('won', 'lost')`);
  const valueRows = await db.select({ value: leads.estimatedValueGbp }).from(leads).where(sql`${leads.status} not in ('won', 'lost')`);
  const pipelineValue = valueRows.reduce((sum, row) => sum + row.value, 0);
  const recentCampaigns = await db.select().from(campaigns).orderBy(desc(campaigns.updatedAt)).limit(5);
  const recentAudit = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(8);
  const pipeline = await db
    .select({ status: leads.status, total: count() })
    .from(leads)
    .groupBy(leads.status);
  const sentCampaigns = await db.select().from(campaigns).where(eq(campaigns.status, "sent"));
  let delivered = 0;
  let opened = 0;
  let recipients = 0;
  for (const campaign of sentCampaigns) {
    const rows = await db.select().from(campaignRecipients).where(eq(campaignRecipients.campaignId, campaign.id));
    recipients += rows.length;
    delivered += rows.filter((row) => ["sent", "delivered", "opened", "clicked"].includes(row.status)).length;
    opened += rows.filter((row) => ["opened", "clicked"].includes(row.status)).length;
  }
  const upcoming = await db.select().from(communityEvents).where(eq(communityEvents.status, "published")).orderBy(communityEvents.startsAt).limit(1);
  return {
    memberCount: Number(memberCount),
    weekCount: Number(weekCount),
    monthCount: Number(monthCount),
    subscribed: Number(subscribed),
    leadCount: Number(leadCount),
    pipelineValue,
    pipeline: Object.fromEntries(pipeline.map((row) => [row.status, Number(row.total)])),
    recentCampaigns,
    recentAudit,
    deliveryRate: recipients ? delivered / recipients : 0,
    openRate: delivered ? opened / delivered : 0,
    upcomingEvent: upcoming[0] ?? null,
    ephemeral: (await import("@/lib/db/client")).isEphemeralDatabase(),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
  };
}
