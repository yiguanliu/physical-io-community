import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const isoNow = () => new Date().toISOString();

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    fullName: text("full_name").notNull(),
    firstName: text("first_name").notNull(),
    city: text("city").notNull().default(""),
    professionalRole: text("professional_role").notNull().default(""),
    experienceRange: text("experience_range").notNull().default(""),
    websiteUrl: text("website_url").notNull().default(""),
    linkedinUrl: text("linkedin_url").notNull().default(""),
    suggestions: text("suggestions").notNull().default(""),
    status: text("status").notNull().default("active"),
    emailStatus: text("email_status").notNull().default("ok"),
    source: text("source").notNull().default("manual"),
    sourceRow: text("source_row"),
    notes: text("notes").notNull().default(""),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    lastContactedAt: text("last_contacted_at"),
    signedUpAt: text("signed_up_at").notNull().$defaultFn(isoNow),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
    updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
  },
  (table) => [
    uniqueIndex("members_email_normalized_idx").on(table.emailNormalized),
    index("members_status_idx").on(table.status),
    index("members_city_idx").on(table.city),
  ],
);

export const memberInterests = sqliteTable(
  "member_interests",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("work_area"),
    interest: text("interest").notNull(),
  },
  (table) => [
    index("member_interests_member_idx").on(table.memberId),
    index("member_interests_kind_idx").on(table.kind),
  ],
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("email"),
    topic: text("topic").notNull(),
    status: text("status").notNull().default("consent_unknown"),
    consentAt: text("consent_at"),
    unsubscribedAt: text("unsubscribed_at"),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
    updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
  },
  (table) => [
    uniqueIndex("subscriptions_member_channel_topic_idx").on(table.memberId, table.channel, table.topic),
  ],
);

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("newsletter"),
  status: text("status").notNull().default("draft"),
  subject: text("subject").notNull(),
  previewText: text("preview_text").notNull().default(""),
  fromName: text("from_name").notNull().default("Physical I/O"),
  replyTo: text("reply_to").notNull().default(""),
  body: text("body").notNull().default(""),
  audienceFilter: text("audience_filter").notNull().default("{}"),
  eventId: text("event_id"),
  scheduledAt: text("scheduled_at"),
  sentAt: text("sent_at"),
  createdByUserId: text("created_by_user_id"),
  createdByName: text("created_by_name").notNull().default(""),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  recipientCount: integer("recipient_count").notNull().default(0),
  skipCount: integer("skip_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(isoNow),
  updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
});

export const campaignRecipients = sqliteTable(
  "campaign_recipients",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    status: text("status").notNull().default("pending"),
    skipReason: text("skip_reason"),
    providerId: text("provider_id"),
    sentAt: text("sent_at"),
    openedAt: text("opened_at"),
    clickedAt: text("clicked_at"),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
  },
  (table) => [
    index("campaign_recipients_campaign_idx").on(table.campaignId),
    uniqueIndex("campaign_recipients_provider_idx").on(table.providerId),
  ],
);

export const campaignEvents = sqliteTable(
  "campaign_events",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id"),
    type: text("type").notNull(),
    providerEventId: text("provider_event_id"),
    payload: text("payload").notNull().default("{}"),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
  },
  (table) => [
    uniqueIndex("campaign_events_provider_event_idx").on(table.providerEventId),
    index("campaign_events_campaign_idx").on(table.campaignId),
  ],
);

export const organisations = sqliteTable("organisations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website").notNull().default(""),
  industry: text("industry").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().$defaultFn(isoNow),
  updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
});

export const contacts = sqliteTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default(""),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
  },
  (table) => [index("contacts_org_idx").on(table.organisationId)],
);

export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    status: text("status").notNull().default("research"),
    fitScore: integer("fit_score").notNull().default(50),
    estimatedValueGbp: integer("estimated_value_gbp").notNull().default(0),
    ownerName: text("owner_name").notNull().default(""),
    nextAction: text("next_action").notNull().default(""),
    nextActionAt: text("next_action_at"),
    lastActivityAt: text("last_activity_at"),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
    updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
  },
  (table) => [index("leads_status_idx").on(table.status)],
);

export const leadActivities = sqliteTable(
  "lead_activities",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull().default(""),
    createdByName: text("created_by_name").notNull().default(""),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
  },
  (table) => [index("lead_activities_lead_idx").on(table.leadId)],
);

export const outreachMessages = sqliteTable(
  "outreach_messages",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft"),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    toEmail: text("to_email").notNull(),
    toName: text("to_name").notNull().default(""),
    providerId: text("provider_id"),
    sentAt: text("sent_at"),
    createdByName: text("created_by_name").notNull().default(""),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
    updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
  },
  (table) => [index("outreach_messages_lead_idx").on(table.leadId)],
);

export const communityEvents = sqliteTable("community_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  venue: text("venue").notNull().default(""),
  startsAt: text("starts_at").notNull(),
  status: text("status").notNull().default("draft"),
  registrationUrl: text("registration_url").notNull().default(""),
  registeredCount: integer("registered_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(isoNow),
  updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
});

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id"),
    actorName: text("actor_name").notNull().default(""),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
  },
  (table) => [index("audit_log_created_idx").on(table.createdAt)],
);

// ---------------------------------------------------------------------------
// Marketing Content Studio (see docs/marketing-content-studio.md).
// Reference mirror of the Supabase tables created in
// supabase/migrations/20260903235607_marketing_content_studio.sql. Persistence
// goes through lib/admin/content-studio.ts via the Supabase service client;
// JSON columns are `text` here to match the legacy Drizzle mirror convention.
// ---------------------------------------------------------------------------
export const contentItems = sqliteTable(
  "content_items",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull().default("Untitled"),
    slug: text("slug").notNull().default(""),
    status: text("status").notNull().default("idea"),
    categoryTags: text("category_tags").notNull().default("[]"),
    viralityScore: integer("virality_score"),
    summary: text("summary").notNull().default(""),
    bodyMarkdown: text("body_markdown").notNull().default(""),
    sourceKind: text("source_kind").notNull().default("manual"),
    sourceUrl: text("source_url").notNull().default(""),
    sourceTitle: text("source_title").notNull().default(""),
    sourceSnippet: text("source_snippet").notNull().default(""),
    assignedTo: text("assigned_to"),
    assignedToName: text("assigned_to_name").notNull().default(""),
    createdByUserId: text("created_by_user_id"),
    createdByName: text("created_by_name").notNull().default(""),
    scheduledAt: text("scheduled_at"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
    updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
  },
  (table) => [
    index("content_items_status_idx").on(table.status),
    index("content_items_scheduled_idx").on(table.scheduledAt),
    index("content_items_updated_idx").on(table.updatedAt),
  ],
);

export const contentEvents = sqliteTable(
  "content_events",
  {
    id: text("id").primaryKey(),
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    detail: text("detail").notNull().default(""),
    actorName: text("actor_name").notNull().default(""),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
  },
  (table) => [index("content_events_item_idx").on(table.contentItemId, table.createdAt)],
);

export const contentTemplates = sqliteTable(
  "content_templates",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    previewUrl: text("preview_url").notNull().default(""),
    layout: text("layout").notNull().default("{}"),
    platformFormats: text("platform_formats").notNull().default("{}"),
    editorial: text("editorial").notNull().default("{}"),
    isShared: integer("is_shared", { mode: "boolean" }).notNull().default(true),
    createdByName: text("created_by_name").notNull().default(""),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
    updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
  },
  (table) => [index("content_templates_shared_idx").on(table.isShared, table.updatedAt)],
);

export const contentAssets = sqliteTable(
  "content_assets",
  {
    id: text("id").primaryKey(),
    contentItemId: text("content_item_id").references(() => contentItems.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("upload"),
    storagePath: text("storage_path").notNull().default(""),
    publicUrl: text("public_url").notNull().default(""),
    width: integer("width"),
    height: integer("height"),
    mime: text("mime").notNull().default("image/png"),
    sourceUrl: text("source_url").notNull().default(""),
    prompt: text("prompt").notNull().default(""),
    altText: text("alt_text").notNull().default(""),
    createdByName: text("created_by_name").notNull().default(""),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
  },
  (table) => [index("content_assets_item_idx").on(table.contentItemId, table.createdAt)],
);

export const contentPlatformVariants = sqliteTable(
  "content_platform_variants",
  {
    id: text("id").primaryKey(),
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    status: text("status").notNull().default("draft"),
    body: text("body").notNull().default(""),
    caption: text("caption").notNull().default(""),
    hashtags: text("hashtags").notNull().default("[]"),
    templateId: text("template_id").references(() => contentTemplates.id, { onDelete: "set null" }),
    renderConfig: text("render_config").notNull().default("{}"),
    renderedAssetId: text("rendered_asset_id").references(() => contentAssets.id, { onDelete: "set null" }),
    scheduledAt: text("scheduled_at"),
    publishedAt: text("published_at"),
    externalPermalink: text("external_permalink").notNull().default(""),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
    updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
  },
  (table) => [
    uniqueIndex("content_platform_variants_item_platform_idx").on(table.contentItemId, table.platform),
  ],
);

export const contentEmailSends = sqliteTable(
  "content_email_sends",
  {
    id: text("id").primaryKey(),
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => contentPlatformVariants.id, { onDelete: "set null" }),
    status: text("status").notNull().default("draft"),
    subject: text("subject").notNull().default(""),
    previewText: text("preview_text").notNull().default(""),
    fromName: text("from_name").notNull().default("Physical I/O"),
    replyTo: text("reply_to").notNull().default(""),
    body: text("body").notNull().default(""),
    audienceFilter: text("audience_filter").notNull().default("{}"),
    scheduledAt: text("scheduled_at"),
    sentAt: text("sent_at"),
    recipientCount: integer("recipient_count").notNull().default(0),
    skipCount: integer("skip_count").notNull().default(0),
    createdByName: text("created_by_name").notNull().default(""),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
    updatedAt: text("updated_at").notNull().$defaultFn(isoNow),
  },
  (table) => [index("content_email_sends_item_idx").on(table.contentItemId)],
);

export const contentEmailRecipients = sqliteTable(
  "content_email_recipients",
  {
    id: text("id").primaryKey(),
    sendId: text("send_id")
      .notNull()
      .references(() => contentEmailSends.id, { onDelete: "cascade" }),
    memberId: text("member_id"),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    status: text("status").notNull().default("pending"),
    skipReason: text("skip_reason"),
    providerId: text("provider_id"),
    sentAt: text("sent_at"),
    createdAt: text("created_at").notNull().$defaultFn(isoNow),
  },
  (table) => [index("content_email_recipients_send_idx").on(table.sendId)],
);

export const contentItemsRelations = relations(contentItems, ({ many }) => ({
  events: many(contentEvents),
  assets: many(contentAssets),
  variants: many(contentPlatformVariants),
  emailSends: many(contentEmailSends),
}));

export const contentPlatformVariantsRelations = relations(contentPlatformVariants, ({ one }) => ({
  item: one(contentItems, { fields: [contentPlatformVariants.contentItemId], references: [contentItems.id] }),
  template: one(contentTemplates, { fields: [contentPlatformVariants.templateId], references: [contentTemplates.id] }),
  renderedAsset: one(contentAssets, { fields: [contentPlatformVariants.renderedAssetId], references: [contentAssets.id] }),
}));

export const membersRelations = relations(members, ({ many }) => ({
  interests: many(memberInterests),
  subscriptions: many(subscriptions),
}));

export const memberInterestsRelations = relations(memberInterests, ({ one }) => ({
  member: one(members, { fields: [memberInterests.memberId], references: [members.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  member: one(members, { fields: [subscriptions.memberId], references: [members.id] }),
}));

export const organisationsRelations = relations(organisations, ({ many }) => ({
  contacts: many(contacts),
  leads: many(leads),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  organisation: one(organisations, { fields: [contacts.organisationId], references: [organisations.id] }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  organisation: one(organisations, { fields: [leads.organisationId], references: [organisations.id] }),
  contact: one(contacts, { fields: [leads.contactId], references: [contacts.id] }),
  activities: many(leadActivities),
  messages: many(outreachMessages),
}));
