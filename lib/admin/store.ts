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
import { isResendConfigured } from "@/lib/email/send";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

type Row = Record<string, any>;

function sb() {
  return getSupabaseAdminClient();
}

function fail(error: unknown): never {
  if (error) throw new Error(error instanceof Error ? error.message : String((error as { message?: string }).message ?? error));
  throw new Error("Supabase request failed.");
}

function camelMember(row: Row) {
  const interests = Array.isArray(row.member_interests) ? row.member_interests : [];
  const subscriptions = Array.isArray(row.subscriptions) ? row.subscriptions : [];
  return {
    id: row.id,
    email: row.email,
    emailNormalized: row.email_normalized,
    fullName: row.full_name,
    firstName: row.first_name,
    city: row.city ?? "",
    professionalRole: row.professional_role ?? "",
    experienceRange: row.experience_range ?? "",
    websiteUrl: row.website_url ?? "",
    linkedinUrl: row.linkedin_url ?? "",
    suggestions: row.suggestions ?? "",
    status: row.status ?? "active",
    emailStatus: row.email_status ?? "ok",
    source: row.source ?? "manual",
    sourceRow: row.source_row ?? null,
    notes: row.notes ?? "",
    unsubscribeToken: row.unsubscribe_token,
    lastContactedAt: row.last_contacted_at ?? null,
    signedUpAt: row.signed_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...interestsForMember(interests, row.id),
    subscriptions: subscriptions.map(camelSubscription),
  };
}

function camelSubscription(row: Row) {
  return {
    id: row.id,
    memberId: row.member_id,
    channel: row.channel,
    topic: row.topic,
    status: row.status,
    consentAt: row.consent_at ?? null,
    unsubscribedAt: row.unsubscribed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function camelCampaign(row: Row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    subject: row.subject,
    previewText: row.preview_text ?? "",
    fromName: row.from_name ?? "Physical I/O",
    replyTo: row.reply_to ?? "",
    body: row.body ?? "",
    audienceFilter: JSON.stringify(row.audience_filter ?? {}),
    eventId: row.event_id ?? null,
    scheduledAt: row.scheduled_at ?? null,
    sentAt: row.sent_at ?? null,
    createdByUserId: row.created_by_user_id ?? null,
    createdByName: row.created_by_name ?? "",
    idempotencyKey: row.idempotency_key,
    recipientCount: row.recipient_count ?? 0,
    skipCount: row.skip_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function camelRecipient(row: Row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    memberId: row.member_id ?? null,
    email: row.email,
    name: row.name ?? "",
    status: row.status,
    skipReason: row.skip_reason ?? null,
    providerId: row.provider_id ?? null,
    sentAt: row.sent_at ?? null,
    openedAt: row.opened_at ?? null,
    clickedAt: row.clicked_at ?? null,
    createdAt: row.created_at,
  };
}

function camelCampaignEvent(row: Row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    recipientId: row.recipient_id ?? null,
    type: row.type,
    providerEventId: row.provider_event_id ?? null,
    payload: JSON.stringify(row.payload ?? {}),
    createdAt: row.created_at,
  };
}

function camelEvent(row: Row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    venue: row.venue ?? "",
    startsAt: row.starts_at,
    status: row.status,
    registrationUrl: row.registration_url ?? "",
    registeredCount: row.registered_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function camelAudit(row: Row) {
  return {
    id: row.id,
    actorUserId: row.actor_user_id ?? null,
    actorName: row.actor_name ?? "",
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? null,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

function interestsForMember(rows: Array<{ member_id?: string; memberId?: string; kind?: string | null; interest: string }>, memberId: string) {
  const items = rows.filter((item) => (item.member_id ?? item.memberId) === memberId);
  const ofKind = (kind: InterestKind) =>
    items.filter((item) => (item.kind || INTEREST_KIND.workArea) === kind).map((item) => item.interest);
  return {
    interests: ofKind(INTEREST_KIND.workArea),
    communityGoals: ofKind(INTEREST_KIND.communityGoal),
    eventFormats: ofKind(INTEREST_KIND.eventFormat),
  };
}

async function selectMember(id: string) {
  const { data, error } = await sb()
    .from("members")
    .select("*, member_interests(*), subscriptions(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error);
  return data ? camelMember(data) : null;
}

export async function writeAudit(input: {
  actorUserId?: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
}) {
  const { error } = await sb().from("audit_log").insert({
    id: createId(),
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    summary: input.summary,
  });
  if (error) fail(error);
}

async function defaultSubscriptions(memberId: string, status: "subscribed" | "consent_unknown") {
  const timestamp = nowIso();
  const { error } = await sb().from("subscriptions").upsert(
    EMAIL_TOPICS.map((topic) => ({
      id: createId(),
      member_id: memberId,
      channel: "email",
      topic,
      status,
      consent_at: status === "subscribed" ? timestamp : null,
      created_at: timestamp,
      updated_at: timestamp,
    })),
    { onConflict: "member_id,channel,topic" },
  );
  if (error) fail(error);
}

export async function listMembers(params: { query?: string; status?: string; city?: string; limit?: number } = {}) {
  const { data, error, count } = await sb()
    .from("members")
    .select("*, member_interests(*), subscriptions(*)", { count: "exact" })
    .order("signed_up_at", { ascending: false })
    .limit(Math.max(params.limit ?? 500, 5000));
  if (error) fail(error);

  const needle = params.query?.trim().toLowerCase();
  const all = (data ?? []).map(camelMember);
  const filtered = all.filter((member) => {
    if (needle) {
      const haystack = [member.fullName, member.email, member.city, member.professionalRole].join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (params.status && params.status !== "all" && member.status !== params.status) return false;
    if (params.city && params.city !== "all" && member.city !== params.city) return false;
    return true;
  });

  return {
    members: filtered.slice(0, params.limit ?? 500),
    total: count ?? all.length,
    cities: [...new Set(all.map((item) => item.city).filter(Boolean))].sort(),
  };
}

export async function getMember(id: string) {
  return selectMember(id);
}

async function replaceInterests(memberId: string, kind: InterestKind, values: string[]) {
  const { error: deleteError } = await sb().from("member_interests").delete().match({ member_id: memberId, kind });
  if (deleteError) fail(deleteError);

  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (!unique.length) return;
  const { error } = await sb().from("member_interests").insert(
    unique.map((interest) => ({ id: createId(), member_id: memberId, kind, interest })),
  );
  if (error) fail(error);
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
  const emailNormalized = normalizeEmail(input.email);
  const timestamp = nowIso();
  const existing = input.id
    ? await getMember(input.id)
    : (await sb().from("members").select("id").eq("email_normalized", emailNormalized).maybeSingle()).data;
  const existingMember = typeof existing?.id === "string" ? await getMember(existing.id) : null;
  const id = input.id ?? existingMember?.id ?? createId();
  const values = {
    email: input.email.trim(),
    email_normalized: emailNormalized,
    full_name: input.fullName.trim(),
    first_name: firstNameFrom(input.fullName),
    city: input.city?.trim() ?? existingMember?.city ?? "",
    professional_role: input.professionalRole?.trim() ?? existingMember?.professionalRole ?? "",
    experience_range: input.experienceRange?.trim() ?? existingMember?.experienceRange ?? "",
    website_url: input.websiteUrl?.trim() ?? existingMember?.websiteUrl ?? "",
    linkedin_url: input.linkedinUrl?.trim() ?? existingMember?.linkedinUrl ?? "",
    suggestions: input.suggestions?.trim() ?? existingMember?.suggestions ?? "",
    status: input.status ?? existingMember?.status ?? "active",
    notes: input.notes ?? existingMember?.notes ?? "",
    source: input.source ?? existingMember?.source ?? "manual",
    source_row: input.sourceRow ?? existingMember?.sourceRow ?? null,
    signed_up_at: input.signedUpAt ?? existingMember?.signedUpAt ?? timestamp,
    updated_at: timestamp,
  };

  if (existingMember) {
    const { error } = await sb().from("members").update(values).eq("id", id);
    if (error) fail(error);
  } else {
    const { error } = await sb().from("members").insert({
      id,
      unsubscribe_token: createToken(),
      email_status: "ok",
      created_at: timestamp,
      ...values,
    });
    if (error) fail(error);
    await defaultSubscriptions(id, input.newsletterConsent ? "subscribed" : "consent_unknown");
  }

  if (input.interests) await replaceInterests(id, INTEREST_KIND.workArea, input.interests);
  if (input.communityGoals) await replaceInterests(id, INTEREST_KIND.communityGoal, input.communityGoals);
  if (input.eventFormats) await replaceInterests(id, INTEREST_KIND.eventFormat, input.eventFormats);
  if (typeof input.newsletterConsent === "boolean" && existingMember) {
    await setMemberSubscription(id, "newsletter", input.newsletterConsent ? "subscribed" : "unsubscribed");
  }

  await writeAudit({
    actorUserId: actor.id,
    actorName: actor.name,
    action: existingMember ? "member.update" : "member.create",
    entityType: "member",
    entityId: id,
    summary: `${existingMember ? "Updated" : "Created"} ${values.full_name} <${emailNormalized}>`,
  });
  return id;
}

export async function importMemberRows(rows: ParsedMemberRow[], actor: { id?: string; name: string }, options: { source?: string } = {}) {
  let created = 0;
  let updated = 0;
  const rejected: string[] = [];
  for (const row of rows) {
    try {
      const { data: existing } = await sb().from("members").select("id").eq("email_normalized", row.email).maybeSingle();
      await upsertMember({ ...row, source: options.source ?? "csv" }, actor);
      if (existing) updated += 1;
      else created += 1;
    } catch (error) {
      rejected.push(`${row.email}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  return { created, updated, rejected };
}

export async function setMemberSubscription(memberId: string, topic: string, status: "subscribed" | "unsubscribed" | "consent_unknown") {
  const timestamp = nowIso();
  const { error } = await sb().from("subscriptions").upsert(
    {
      id: createId(),
      member_id: memberId,
      channel: "email",
      topic,
      status,
      consent_at: status === "subscribed" ? timestamp : null,
      unsubscribed_at: status === "unsubscribed" ? timestamp : null,
      updated_at: timestamp,
    },
    { onConflict: "member_id,channel,topic" },
  );
  if (error) fail(error);
  if (status === "unsubscribed" && topic === "newsletter") {
    const { error: memberError } = await sb().from("members").update({ email_status: "unsubscribed", updated_at: timestamp }).eq("id", memberId);
    if (memberError) fail(memberError);
  }
}

export async function unsubscribeByToken(token: string) {
  const { data, error } = await sb().from("members").select("*").eq("unsubscribe_token", token).maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const timestamp = nowIso();
  const { error: memberError } = await sb().from("members").update({ email_status: "unsubscribed", updated_at: timestamp }).eq("id", data.id);
  if (memberError) fail(memberError);
  const { error: subscriptionError } = await sb()
    .from("subscriptions")
    .update({ status: "unsubscribed", unsubscribed_at: timestamp, updated_at: timestamp })
    .eq("member_id", data.id);
  if (subscriptionError) fail(subscriptionError);
  return camelMember(data);
}

export async function listCampaigns() {
  const { data, error } = await sb().from("campaigns").select("*").order("updated_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map(camelCampaign);
}

export async function getCampaign(id: string) {
  const { data, error } = await sb().from("campaigns").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const [{ data: recipientRows, error: recipientError }, { data: eventRows, error: eventError }] = await Promise.all([
    sb().from("campaign_recipients").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
    sb().from("campaign_events").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
  ]);
  if (recipientError) fail(recipientError);
  if (eventError) fail(eventError);
  const campaign = camelCampaign(data);
  return {
    ...campaign,
    audience: parseAudienceFilter(campaign.audienceFilter),
    recipients: (recipientRows ?? []).map(camelRecipient),
    events: (eventRows ?? []).map(camelCampaignEvent),
  };
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
  const timestamp = nowIso();
  const id = input.id ?? createId();
  const existing = input.id ? await getCampaign(input.id) : null;
  if (existing && !["draft", "failed"].includes(existing.status)) throw new Error("Only draft campaigns can be edited.");
  const values = {
    name: input.name.trim(),
    type: input.type,
    subject: input.subject.trim(),
    preview_text: input.previewText?.trim() ?? "",
    from_name: input.fromName?.trim() || "Physical I/O",
    reply_to: input.replyTo?.trim() ?? "",
    body: input.body,
    audience_filter: input.audienceFilter ?? { campaignType: input.type, requireConsent: true },
    event_id: input.eventId ?? null,
    updated_at: timestamp,
    created_by_user_id: actor.id ?? null,
    created_by_name: actor.name,
  };
  const { error } = existing
    ? await sb().from("campaigns").update(values).eq("id", id)
    : await sb().from("campaigns").insert({ id, status: "draft", idempotency_key: createId(), created_at: timestamp, ...values });
  if (error) fail(error);
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
  const { data, error } = await sb().from("leads").select("*, organisations(*), contacts(*)").order("updated_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    organisationId: row.organisation_id,
    contactId: row.contact_id,
    status: row.status,
    fitScore: row.fit_score,
    estimatedValueGbp: row.estimated_value_gbp,
    ownerName: row.owner_name ?? "",
    nextAction: row.next_action ?? "",
    nextActionAt: row.next_action_at ?? null,
    lastActivityAt: row.last_activity_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    company: row.organisations?.name ?? "",
    website: row.organisations?.website ?? "",
    industry: row.organisations?.industry ?? "",
    contactName: row.contacts?.name ?? "",
    contactEmail: row.contacts?.email ?? "",
    contactRole: row.contacts?.role ?? "",
  }));
}

export async function getLead(id: string) {
  const { data, error } = await sb().from("leads").select("*, organisations(*), contacts(*)").eq("id", id).maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const [{ data: activities, error: activityError }, { data: messages, error: messageError }] = await Promise.all([
    sb().from("lead_activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    sb().from("outreach_messages").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);
  if (activityError) fail(activityError);
  if (messageError) fail(messageError);
  return {
    id: data.id,
    organisationId: data.organisation_id,
    contactId: data.contact_id,
    status: data.status,
    fitScore: data.fit_score,
    estimatedValueGbp: data.estimated_value_gbp,
    ownerName: data.owner_name ?? "",
    nextAction: data.next_action ?? "",
    nextActionAt: data.next_action_at ?? null,
    lastActivityAt: data.last_activity_at ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    company: data.organisations?.name ?? "",
    website: data.organisations?.website ?? "",
    industry: data.organisations?.industry ?? "",
    orgNotes: data.organisations?.notes ?? "",
    contactName: data.contacts?.name ?? "",
    contactEmail: data.contacts?.email ?? "",
    contactRole: data.contacts?.role ?? "",
    activities: (activities ?? []).map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      type: row.type,
      title: row.title,
      detail: row.detail ?? "",
      createdByName: row.created_by_name ?? "",
      createdAt: row.created_at,
    })),
    messages: (messages ?? []).map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      status: row.status,
      subject: row.subject,
      body: row.body,
      toEmail: row.to_email,
      toName: row.to_name ?? "",
      providerId: row.provider_id ?? null,
      sentAt: row.sent_at ?? null,
      createdByName: row.created_by_name ?? "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
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
  const timestamp = nowIso();
  const organisationId = createId();
  const contactId = createId();
  const leadId = createId();
  const { error: orgError } = await sb().from("organisations").insert({
    id: organisationId,
    name: input.company.trim(),
    website: input.website?.trim() ?? "",
    industry: input.industry?.trim() ?? "",
    created_at: timestamp,
    updated_at: timestamp,
  });
  if (orgError) fail(orgError);
  const { error: contactError } = await sb().from("contacts").insert({
    id: contactId,
    organisation_id: organisationId,
    name: input.contactName.trim(),
    email: input.contactEmail.trim(),
    role: input.contactRole?.trim() ?? "",
    created_at: timestamp,
  });
  if (contactError) fail(contactError);
  const { error: leadError } = await sb().from("leads").insert({
    id: leadId,
    organisation_id: organisationId,
    contact_id: contactId,
    status: input.status ?? "research",
    fit_score: input.fitScore ?? 50,
    estimated_value_gbp: input.estimatedValueGbp ?? 0,
    owner_name: actor.name,
    next_action: input.nextAction ?? "Research the organisation",
    last_activity_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  });
  if (leadError) fail(leadError);
  await addLeadActivity(leadId, { type: "status", title: "Lead created", detail: `Assigned to ${actor.name}`, createdByName: actor.name });
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

async function addLeadActivity(leadId: string, input: { type: string; title: string; detail?: string; createdByName: string }) {
  const { error } = await sb().from("lead_activities").insert({
    id: createId(),
    lead_id: leadId,
    type: input.type,
    title: input.title,
    detail: input.detail ?? "",
    created_by_name: input.createdByName,
  });
  if (error) fail(error);
}

export async function updateLeadStatus(leadId: string, status: string, actor: { name: string; id?: string }) {
  const timestamp = nowIso();
  const { error } = await sb().from("leads").update({ status, updated_at: timestamp, last_activity_at: timestamp }).eq("id", leadId);
  if (error) fail(error);
  await addLeadActivity(leadId, { type: "status", title: `Status moved to ${status}`, createdByName: actor.name });
}

export async function addLeadNote(leadId: string, note: string, actor: { name: string; id?: string }) {
  const timestamp = nowIso();
  await addLeadActivity(leadId, { type: "note", title: "Internal note", detail: note.trim(), createdByName: actor.name });
  const { error } = await sb().from("leads").update({ updated_at: timestamp, last_activity_at: timestamp }).eq("id", leadId);
  if (error) fail(error);
}

export async function completeNextAction(leadId: string, actor: { name: string }) {
  const timestamp = nowIso();
  const { error } = await sb().from("leads").update({ next_action: "", next_action_at: null, updated_at: timestamp, last_activity_at: timestamp }).eq("id", leadId);
  if (error) fail(error);
  await addLeadActivity(leadId, { type: "task", title: "Next action completed", createdByName: actor.name });
}

export async function saveOutreachDraft(input: {
  leadId: string;
  subject: string;
  body: string;
  toEmail: string;
  toName: string;
}, actor: { name: string; id?: string }) {
  const id = createId();
  const { error } = await sb().from("outreach_messages").insert({
    id,
    lead_id: input.leadId,
    status: "draft",
    subject: input.subject.trim(),
    body: input.body,
    to_email: input.toEmail.trim(),
    to_name: input.toName.trim(),
    created_by_name: actor.name,
  });
  if (error) fail(error);
  return id;
}

export async function listEvents() {
  const { data, error } = await sb().from("community_events").select("*").order("starts_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map(camelEvent);
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
  const timestamp = nowIso();
  const id = input.id ?? createId();
  const values = {
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    venue: input.venue?.trim() ?? "",
    starts_at: input.startsAt,
    status: input.status ?? "draft",
    registration_url: input.registrationUrl?.trim() ?? "",
    registered_count: input.registeredCount ?? 0,
    updated_at: timestamp,
  };
  const { error } = await sb().from("community_events").upsert({ id, created_at: timestamp, ...values });
  if (error) fail(error);
  return id;
}

function emptyOverviewStats(databaseError: string | null = null) {
  return {
    memberCount: 0,
    weekCount: 0,
    monthCount: 0,
    subscribed: 0,
    leadCount: 0,
    pipelineValue: 0,
    pipeline: {} as Record<string, number>,
    recentCampaigns: [] as ReturnType<typeof camelCampaign>[],
    recentAudit: [] as ReturnType<typeof camelAudit>[],
    deliveryRate: 0,
    openRate: 0,
    upcomingEvent: null as ReturnType<typeof camelEvent> | null,
    ephemeral: false,
    resendConfigured: isResendConfigured(),
    databaseError,
  };
}

function requestErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Supabase request failed.";
}

export async function overviewStats() {
  const [membersResult, subscriptionsResult, leadsResult, campaignsResult, auditResult, eventsResult] = await Promise.all([
    sb().from("members").select("*"),
    sb().from("subscriptions").select("*"),
    sb().from("leads").select("*"),
    sb().from("campaigns").select("*").order("updated_at", { ascending: false }),
    sb().from("audit_log").select("*").order("created_at", { ascending: false }).limit(8),
    sb().from("community_events").select("*").eq("status", "published").order("starts_at", { ascending: true }).limit(1),
  ]).catch((error) => {
    return [
      { data: null, error: { message: requestErrorMessage(error) } },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ];
  });
  for (const result of [membersResult, subscriptionsResult, leadsResult, campaignsResult, auditResult, eventsResult]) {
    if (result.error) return emptyOverviewStats(result.error.message);
  }
  const memberRows = membersResult.data ?? [];
  const subscriptionRows = subscriptionsResult.data ?? [];
  const leadRows = leadsResult.data ?? [];
  const campaignRows = campaignsResult.data ?? [];
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const openLeads = leadRows.filter((lead) => !["won", "lost"].includes(lead.status));
  const sentCampaigns = campaignRows.filter((campaign) => campaign.status === "sent");
  let recipients = 0;
  let delivered = 0;
  let opened = 0;
  for (const campaign of sentCampaigns) {
    const { data, error } = await sb().from("campaign_recipients").select("*").eq("campaign_id", campaign.id);
    if (error) return emptyOverviewStats(error.message);
    const rows = data ?? [];
    recipients += rows.length;
    delivered += rows.filter((row) => ["sent", "delivered", "opened", "clicked"].includes(row.status)).length;
    opened += rows.filter((row) => ["opened", "clicked"].includes(row.status)).length;
  }
  const pipeline = openLeads.reduce<Record<string, number>>((memo, lead) => {
    memo[lead.status] = (memo[lead.status] ?? 0) + 1;
    return memo;
  }, {});
  return {
    memberCount: memberRows.length,
    weekCount: memberRows.filter((row) => Date.parse(row.signed_up_at) >= weekAgo).length,
    monthCount: memberRows.filter((row) => Date.parse(row.signed_up_at) >= monthAgo).length,
    subscribed: subscriptionRows.filter((row) => row.topic === "newsletter" && row.status === "subscribed").length,
    leadCount: openLeads.length,
    pipelineValue: openLeads.reduce((sum, lead) => sum + (lead.estimated_value_gbp ?? 0), 0),
    pipeline,
    recentCampaigns: campaignRows.slice(0, 5).map(camelCampaign),
    recentAudit: (auditResult.data ?? []).map(camelAudit),
    deliveryRate: recipients ? delivered / recipients : 0,
    openRate: delivered ? opened / delivered : 0,
    upcomingEvent: eventsResult.data?.[0] ? camelEvent(eventsResult.data[0]) : null,
    ephemeral: false,
    resendConfigured: isResendConfigured(),
    databaseError: null,
  };
}

export async function updateCampaignRows(
  table: "campaigns" | "campaign_recipients" | "campaign_events" | "members" | "leads" | "outreach_messages",
  values: Row,
  id: string,
) {
  const { error } = await sb().from(table).update(values).eq("id", id);
  if (error) fail(error);
}

export async function insertRows(table: string, values: Row | Row[]) {
  const { error } = await sb().from(table).insert(values);
  if (error) fail(error);
}

export async function deleteRows(table: string, column: string, value: string) {
  const { error } = await sb().from(table).delete().eq(column, value);
  if (error) fail(error);
}

export async function findCampaignRecipient(input: { providerId?: string; email?: string }) {
  const query = sb().from("campaign_recipients").select("*").limit(1);
  if (input.providerId) query.eq("provider_id", input.providerId);
  else if (input.email) query.eq("email", input.email);
  else return null;
  const { data, error } = await query.maybeSingle();
  if (error) fail(error);
  return data ? camelRecipient(data) : null;
}

export async function findCampaignEvent(providerEventId: string) {
  const { data, error } = await sb().from("campaign_events").select("id").eq("provider_event_id", providerEventId).maybeSingle();
  if (error) fail(error);
  return data ? { id: data.id } : null;
}

export async function getRawMember(id: string) {
  const { data, error } = await sb().from("members").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  return data ? camelMember(data) : null;
}

export async function getRawOutreachMessage(id: string) {
  const { data, error } = await sb().from("outreach_messages").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  return data
    ? {
        id: data.id,
        leadId: data.lead_id,
        status: data.status,
        subject: data.subject,
        body: data.body,
        toEmail: data.to_email,
        toName: data.to_name,
        providerId: data.provider_id ?? null,
        sentAt: data.sent_at ?? null,
        createdAt: data.created_at,
      }
    : null;
}
