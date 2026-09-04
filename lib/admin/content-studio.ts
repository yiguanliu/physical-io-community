// Data layer for the Marketing Content Studio.
// Mirrors lib/admin/store.ts conventions: Supabase service client, snake_case
// rows in, camelCase objects out. See docs/marketing-content-studio.md.

import { createId, nowIso } from "@/lib/db/ids";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { writeAudit } from "@/lib/admin/store";
import { PLATFORMS, type ContentStage, type Platform } from "@/lib/marketing/config";

type Row = Record<string, any>;

function sb() {
  return getSupabaseAdminClient();
}

function fail(error: unknown): never {
  if (error) throw new Error(error instanceof Error ? error.message : String((error as { message?: string }).message ?? error));
  throw new Error("Supabase request failed.");
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------
export type ContentAsset = ReturnType<typeof camelAsset>;
export type ContentVariant = ReturnType<typeof camelVariant>;
export type ContentEvent = ReturnType<typeof camelEvent>;
export type ContentTemplate = ReturnType<typeof camelTemplate>;

function camelItem(row: Row) {
  return {
    id: row.id as string,
    title: (row.title ?? "Untitled") as string,
    slug: (row.slug ?? "") as string,
    status: (row.status ?? "idea") as ContentStage,
    categoryTags: parseJson<string[]>(row.category_tags, []),
    viralityScore: (row.virality_score ?? null) as number | null,
    summary: (row.summary ?? "") as string,
    bodyMarkdown: (row.body_markdown ?? "") as string,
    sourceKind: (row.source_kind ?? "manual") as "web" | "manual" | "ai",
    sourceUrl: (row.source_url ?? "") as string,
    sourceTitle: (row.source_title ?? "") as string,
    sourceSnippet: (row.source_snippet ?? "") as string,
    assignedTo: (row.assigned_to ?? null) as string | null,
    assignedToName: (row.assigned_to_name ?? "") as string,
    createdByUserId: (row.created_by_user_id ?? null) as string | null,
    createdByName: (row.created_by_name ?? "") as string,
    scheduledAt: (row.scheduled_at ?? null) as string | null,
    publishedAt: (row.published_at ?? null) as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function camelEvent(row: Row) {
  return {
    id: row.id as string,
    contentItemId: row.content_item_id as string,
    type: row.type as string,
    fromStatus: (row.from_status ?? null) as string | null,
    toStatus: (row.to_status ?? null) as string | null,
    detail: (row.detail ?? "") as string,
    actorName: (row.actor_name ?? "") as string,
    createdAt: row.created_at as string,
  };
}

function camelAsset(row: Row) {
  return {
    id: row.id as string,
    contentItemId: (row.content_item_id ?? null) as string | null,
    kind: (row.kind ?? "upload") as "upload" | "ai_generated" | "rendered",
    storagePath: (row.storage_path ?? "") as string,
    publicUrl: (row.public_url ?? "") as string,
    width: (row.width ?? null) as number | null,
    height: (row.height ?? null) as number | null,
    mime: (row.mime ?? "image/png") as string,
    sourceUrl: (row.source_url ?? "") as string,
    prompt: (row.prompt ?? "") as string,
    altText: (row.alt_text ?? "") as string,
    createdByName: (row.created_by_name ?? "") as string,
    createdAt: row.created_at as string,
  };
}

function camelVariant(row: Row) {
  return {
    id: row.id as string,
    contentItemId: row.content_item_id as string,
    platform: row.platform as Platform,
    status: (row.status ?? "draft") as "draft" | "ready" | "published",
    body: (row.body ?? "") as string,
    caption: (row.caption ?? "") as string,
    hashtags: parseJson<string[]>(row.hashtags, []),
    templateId: (row.template_id ?? null) as string | null,
    renderConfig: parseJson<Record<string, any>>(row.render_config, {}),
    renderedAssetId: (row.rendered_asset_id ?? null) as string | null,
    renderedAsset: row.rendered_asset ? camelAsset(row.rendered_asset) : null,
    scheduledAt: (row.scheduled_at ?? null) as string | null,
    publishedAt: (row.published_at ?? null) as string | null,
    externalPermalink: (row.external_permalink ?? "") as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function camelTemplate(row: Row) {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description ?? "") as string,
    previewUrl: (row.preview_url ?? "") as string,
    layout: parseJson<Record<string, any>>(row.layout, {}),
    platformFormats: parseJson<Record<string, any>>(row.platform_formats, {}),
    editorial: parseJson<Record<string, any>>(row.editorial, {}),
    isShared: Boolean(row.is_shared),
    createdByName: (row.created_by_name ?? "") as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export type ContentItem = ReturnType<typeof camelItem>;
export type ContentItemDetail = ContentItem & {
  events: ContentEvent[];
  assets: ContentAsset[];
  variants: ContentVariant[];
};
export type ContentItemSummary = ContentItem & {
  variants: Array<Pick<ContentVariant, "platform" | "status">>;
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function listContentItems(params: { status?: string; tag?: string; query?: string } = {}) {
  let query = sb()
    .from("content_items")
    .select("*, variants:content_platform_variants(platform,status)")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  if (params.query) query = query.ilike("title", `%${params.query}%`);
  const { data, error } = await query;
  if (error) fail(error);
  let items: ContentItemSummary[] = (data ?? []).map((row) => ({
    ...camelItem(row),
    variants: ((row.variants ?? []) as Row[]).map((variant) => ({
      platform: variant.platform as Platform,
      status: (variant.status ?? "draft") as ContentVariant["status"],
    })),
  }));
  if (params.tag) items = items.filter((item) => item.categoryTags.includes(params.tag!));
  return items;
}

export async function getContentItem(id: string): Promise<ContentItemDetail | null> {
  const { data, error } = await sb().from("content_items").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const item = camelItem(data);

  const [{ data: eventRows }, { data: assetRows }, { data: variantRows }] = await Promise.all([
    sb().from("content_events").select("*").eq("content_item_id", id).order("created_at", { ascending: false }),
    sb().from("content_assets").select("*").eq("content_item_id", id).order("created_at", { ascending: false }),
    sb()
      .from("content_platform_variants")
      .select("*, rendered_asset:content_assets!content_platform_variants_rendered_asset_id_fkey(*)")
      .eq("content_item_id", id),
  ]);

  return {
    ...item,
    events: (eventRows ?? []).map(camelEvent),
    assets: (assetRows ?? []).map(camelAsset),
    variants: (variantRows ?? []).map(camelVariant),
  };
}

export async function listTemplates() {
  const { data, error } = await sb().from("content_templates").select("*").order("updated_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map(camelTemplate);
}

export async function getTemplate(id: string) {
  const { data, error } = await sb().from("content_templates").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  return data ? camelTemplate(data) : null;
}

export async function listReadyToPost() {
  const { data, error } = await sb()
    .from("content_items")
    .select("*")
    .in("status", ["approved", "scheduled"])
    .order("updated_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map(camelItem);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------
type Actor = { id?: string | null; name: string };

async function logEvent(input: {
  contentItemId: string;
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  detail?: string;
  actorName: string;
}) {
  const { error } = await sb().from("content_events").insert({
    id: createId(),
    content_item_id: input.contentItemId,
    type: input.type,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    detail: input.detail ?? "",
    actor_name: input.actorName,
    created_at: nowIso(),
  });
  if (error) fail(error);
}

export async function createContentItem(
  input: {
    title: string;
    summary?: string;
    categoryTags?: string[];
    sourceKind?: "web" | "manual" | "ai";
    sourceUrl?: string;
    sourceTitle?: string;
    sourceSnippet?: string;
    viralityScore?: number | null;
    bodyMarkdown?: string;
  },
  actor: Actor,
) {
  const id = createId();
  const timestamp = nowIso();
  const slug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  const { error } = await sb().from("content_items").insert({
    id,
    title: input.title || "Untitled",
    slug,
    status: "idea",
    category_tags: JSON.stringify(input.categoryTags ?? []),
    virality_score: input.viralityScore ?? null,
    summary: input.summary ?? "",
    body_markdown: input.bodyMarkdown ?? "",
    source_kind: input.sourceKind ?? "manual",
    source_url: input.sourceUrl ?? "",
    source_title: input.sourceTitle ?? "",
    source_snippet: input.sourceSnippet ?? "",
    created_by_user_id: actor.id ?? null,
    created_by_name: actor.name,
    created_at: timestamp,
    updated_at: timestamp,
  });
  if (error) fail(error);
  await logEvent({ contentItemId: id, type: "note", detail: `Created from ${input.sourceKind ?? "manual"} source`, actorName: actor.name });
  await writeAudit({
    actorUserId: actor.id,
    actorName: actor.name,
    action: "content.create",
    entityType: "content_item",
    entityId: id,
    summary: `Created content "${input.title}"`,
  });
  return id;
}

export async function updateContentItem(id: string, values: Row, actor: Actor, options: { logType?: string; detail?: string } = {}) {
  const patch: Row = { ...values, updated_at: nowIso() };
  if (patch.category_tags && typeof patch.category_tags !== "string") patch.category_tags = JSON.stringify(patch.category_tags);
  const { error } = await sb().from("content_items").update(patch).eq("id", id);
  if (error) fail(error);
  if (options.logType) {
    await logEvent({ contentItemId: id, type: options.logType, detail: options.detail ?? "", actorName: actor.name });
  }
}

export async function moveContentStage(id: string, toStatus: ContentStage, actor: Actor) {
  const current = await sb().from("content_items").select("status").eq("id", id).maybeSingle();
  const fromStatus = (current.data?.status ?? null) as string | null;
  const patch: Row = { status: toStatus, updated_at: nowIso() };
  if (toStatus === "published") patch.published_at = nowIso();
  const { error } = await sb().from("content_items").update(patch).eq("id", id);
  if (error) fail(error);
  await logEvent({ contentItemId: id, type: "stage_change", fromStatus, toStatus, actorName: actor.name });
  await writeAudit({
    actorUserId: actor.id,
    actorName: actor.name,
    action: "content.stage",
    entityType: "content_item",
    entityId: id,
    summary: `Moved to ${toStatus}`,
  });
}

export async function addContentNote(id: string, detail: string, actor: Actor) {
  await logEvent({ contentItemId: id, type: "note", detail, actorName: actor.name });
}

export async function deleteContentItem(id: string, actor: Actor) {
  const { error } = await sb().from("content_items").delete().eq("id", id);
  if (error) fail(error);
  await writeAudit({
    actorUserId: actor.id,
    actorName: actor.name,
    action: "content.delete",
    entityType: "content_item",
    entityId: id,
    summary: "Deleted content item",
  });
}

// --- Platform variants -----------------------------------------------------
export async function upsertVariant(
  contentItemId: string,
  platform: Platform,
  values: Partial<{
    status: string;
    body: string;
    caption: string;
    hashtags: string[];
    templateId: string | null;
    renderConfig: Record<string, any>;
    renderedAssetId: string | null;
    scheduledAt: string | null;
    externalPermalink: string;
  }>,
) {
  const existing = await sb()
    .from("content_platform_variants")
    .select("id")
    .eq("content_item_id", contentItemId)
    .eq("platform", platform)
    .maybeSingle();

  const patch: Row = { updated_at: nowIso() };
  if (values.status !== undefined) patch.status = values.status;
  if (values.body !== undefined) patch.body = values.body;
  if (values.caption !== undefined) patch.caption = values.caption;
  if (values.hashtags !== undefined) patch.hashtags = JSON.stringify(values.hashtags);
  if (values.templateId !== undefined) patch.template_id = values.templateId;
  if (values.renderConfig !== undefined) patch.render_config = JSON.stringify(values.renderConfig);
  if (values.renderedAssetId !== undefined) patch.rendered_asset_id = values.renderedAssetId;
  if (values.scheduledAt !== undefined) patch.scheduled_at = values.scheduledAt;
  if (values.externalPermalink !== undefined) patch.external_permalink = values.externalPermalink;

  if (existing.data?.id) {
    const { error } = await sb().from("content_platform_variants").update(patch).eq("id", existing.data.id);
    if (error) fail(error);
    return existing.data.id as string;
  }

  const id = createId();
  const timestamp = nowIso();
  const { error } = await sb().from("content_platform_variants").insert({
    id,
    content_item_id: contentItemId,
    platform,
    created_at: timestamp,
    ...patch,
  });
  if (error) fail(error);
  return id;
}

/** Seed all platform variants from the confirmed master draft. */
export async function seedVariantsFromDraft(item: ContentItem, actor: Actor) {
  for (const platform of PLATFORMS) {
    await upsertVariant(item.id, platform, { body: item.bodyMarkdown, status: "draft" });
  }
  await logEvent({ contentItemId: item.id, type: "note", detail: "Seeded platform variants from confirmed draft", actorName: actor.name });
}

// --- Assets ----------------------------------------------------------------
export async function recordAsset(input: {
  contentItemId?: string | null;
  kind: "upload" | "ai_generated" | "rendered";
  storagePath: string;
  publicUrl: string;
  width?: number | null;
  height?: number | null;
  mime?: string;
  sourceUrl?: string;
  prompt?: string;
  altText?: string;
  createdByName: string;
}) {
  const id = createId();
  const { error } = await sb().from("content_assets").insert({
    id,
    content_item_id: input.contentItemId ?? null,
    kind: input.kind,
    storage_path: input.storagePath,
    public_url: input.publicUrl,
    width: input.width ?? null,
    height: input.height ?? null,
    mime: input.mime ?? "image/png",
    source_url: input.sourceUrl ?? "",
    prompt: input.prompt ?? "",
    alt_text: input.altText ?? "",
    created_by_name: input.createdByName,
    created_at: nowIso(),
  });
  if (error) fail(error);
  if (input.contentItemId) {
    await logEvent({ contentItemId: input.contentItemId, type: "asset", detail: `Added ${input.kind} asset`, actorName: input.createdByName });
  }
  return id;
}

// --- Templates -------------------------------------------------------------
export async function createTemplate(
  input: { name: string; description?: string; layout?: Record<string, any>; platformFormats?: Record<string, any>; editorial?: Record<string, any>; previewUrl?: string },
  actor: Actor,
) {
  const id = createId();
  const timestamp = nowIso();
  const { error } = await sb().from("content_templates").insert({
    id,
    name: input.name,
    description: input.description ?? "",
    preview_url: input.previewUrl ?? "",
    layout: JSON.stringify(input.layout ?? {}),
    platform_formats: JSON.stringify(input.platformFormats ?? {}),
    editorial: JSON.stringify(input.editorial ?? {}),
    is_shared: true,
    created_by_name: actor.name,
    created_at: timestamp,
    updated_at: timestamp,
  });
  if (error) fail(error);
  return id;
}

export async function updateTemplate(id: string, values: Partial<{ name: string; description: string; layout: Record<string, any>; platformFormats: Record<string, any>; editorial: Record<string, any>; previewUrl: string }>) {
  const patch: Row = { updated_at: nowIso() };
  if (values.name !== undefined) patch.name = values.name;
  if (values.description !== undefined) patch.description = values.description;
  if (values.previewUrl !== undefined) patch.preview_url = values.previewUrl;
  if (values.layout !== undefined) patch.layout = JSON.stringify(values.layout);
  if (values.platformFormats !== undefined) patch.platform_formats = JSON.stringify(values.platformFormats);
  if (values.editorial !== undefined) patch.editorial = JSON.stringify(values.editorial);
  const { error } = await sb().from("content_templates").update(patch).eq("id", id);
  if (error) fail(error);
}

export async function deleteTemplate(id: string) {
  const { error } = await sb().from("content_templates").delete().eq("id", id);
  if (error) fail(error);
}

// --- Email sends -----------------------------------------------------------
export async function createEmailSend(input: {
  contentItemId: string;
  variantId?: string | null;
  subject: string;
  previewText?: string;
  fromName?: string;
  replyTo?: string;
  body: string;
  scheduledAt?: string | null;
  createdByName: string;
}) {
  const id = createId();
  const timestamp = nowIso();
  const { error } = await sb().from("content_email_sends").insert({
    id,
    content_item_id: input.contentItemId,
    variant_id: input.variantId ?? null,
    status: input.scheduledAt ? "scheduled" : "draft",
    subject: input.subject,
    preview_text: input.previewText ?? "",
    from_name: input.fromName ?? "Physical I/O",
    reply_to: input.replyTo ?? "",
    body: input.body,
    audience_filter: JSON.stringify({}),
    scheduled_at: input.scheduledAt ?? null,
    created_by_name: input.createdByName,
    created_at: timestamp,
    updated_at: timestamp,
  });
  if (error) fail(error);
  return id;
}

export async function getEmailSend(id: string) {
  const { data, error } = await sb().from("content_email_sends").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  return {
    id: data.id as string,
    contentItemId: data.content_item_id as string,
    variantId: (data.variant_id ?? null) as string | null,
    status: data.status as string,
    subject: (data.subject ?? "") as string,
    previewText: (data.preview_text ?? "") as string,
    fromName: (data.from_name ?? "Physical I/O") as string,
    replyTo: (data.reply_to ?? "") as string,
    body: (data.body ?? "") as string,
    scheduledAt: (data.scheduled_at ?? null) as string | null,
    sentAt: (data.sent_at ?? null) as string | null,
    recipientCount: (data.recipient_count ?? 0) as number,
    skipCount: (data.skip_count ?? 0) as number,
  };
}

export async function updateEmailSend(id: string, values: Row) {
  const { error } = await sb().from("content_email_sends").update({ ...values, updated_at: nowIso() }).eq("id", id);
  if (error) fail(error);
}

export async function insertEmailRecipients(rows: Row[]) {
  if (!rows.length) return;
  const { error } = await sb().from("content_email_recipients").insert(rows);
  if (error) fail(error);
}
