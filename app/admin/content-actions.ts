"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  addContentNote,
  createContentItem,
  createEmailSend,
  createTemplate,
  deleteContentItem,
  deleteTemplate,
  getContentItem,
  getTemplate,
  moveContentStage,
  recordAsset,
  seedVariantsFromDraft,
  updateContentItem,
  updateTemplate,
  upsertVariant,
} from "@/lib/admin/content-studio";
import { adaptForPlatform, draftFromSource } from "@/lib/marketing/ai";
import { generateMarketingImage } from "@/lib/marketing/image";
import { importFromUrl } from "@/lib/marketing/storage";
import { notifyAdminsContentReady } from "@/lib/marketing/notify";
import { sendNewsletter, sendNewsletterTest } from "@/lib/marketing/newsletter";
import { isContentStage, isPlatform, PLATFORM_META, readyPlatforms, type Platform } from "@/lib/marketing/config";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function tagList(form: FormData, key: string) {
  return String(form.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function revalidateItem(id: string) {
  revalidatePath("/admin/marketing");
  revalidatePath(`/admin/marketing/${id}`);
}

// --- Create / lifecycle ----------------------------------------------------
export async function createContentAction(formData: FormData) {
  const admin = await requireAdmin();
  const title = text(formData, "title") || "Untitled";
  const id = await createContentItem(
    {
      title,
      summary: text(formData, "summary"),
      categoryTags: tagList(formData, "categoryTags"),
      sourceKind: (text(formData, "sourceKind") as "web" | "manual" | "ai") || "manual",
      sourceUrl: text(formData, "sourceUrl"),
      sourceTitle: text(formData, "sourceTitle"),
      sourceSnippet: text(formData, "sourceSnippet"),
    },
    admin,
  );
  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${id}`);
}

export async function moveStageAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const to = text(formData, "status");
  if (!id || !isContentStage(to)) throw new Error("Invalid stage change.");
  if (to === "approved") throw new Error("Use Approve & notify so the readiness gate and admin notification both run.");
  if (to === "scheduled") throw new Error("Use the schedule control to set a publish date first.");
  await moveContentStage(id, to, admin);
  revalidateItem(id);
}

export async function updateContentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  if (!id) throw new Error("Missing content id.");
  const patch: Record<string, unknown> = {};
  if (formData.has("title")) patch.title = text(formData, "title") || "Untitled";
  if (formData.has("summary")) patch.summary = text(formData, "summary");
  if (formData.has("bodyMarkdown")) patch.body_markdown = String(formData.get("bodyMarkdown") ?? "");
  if (formData.has("categoryTags")) patch.category_tags = tagList(formData, "categoryTags");
  if (formData.has("scheduledAt")) patch.scheduled_at = text(formData, "scheduledAt") || null;
  await updateContentItem(id, patch, admin, { logType: "note", detail: "Edited content" });
  revalidateItem(id);
}

export async function addNoteAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const note = text(formData, "note");
  if (id && note) await addContentNote(id, note, admin);
  revalidateItem(id);
}

export async function deleteContentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  if (id) await deleteContentItem(id, admin);
  revalidatePath("/admin/marketing");
  redirect("/admin/marketing");
}

// --- Drafting --------------------------------------------------------------
export async function generateDraftAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const item = await getContentItem(id);
  if (!item) throw new Error("Content not found.");
  const result = await draftFromSource({
    title: item.title,
    hook: item.summary,
    sourceTitle: item.sourceTitle,
    sourceUrl: item.sourceUrl,
    snippet: item.sourceSnippet,
    tags: item.categoryTags,
  });
  await updateContentItem(
    id,
    { body_markdown: result.body, status: item.status === "idea" ? "drafting" : item.status },
    admin,
    { logType: "ai_generation", detail: `Drafted from source (${result.provider})` },
  );
  revalidateItem(id);
}

export async function confirmDraftAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const body = String(formData.get("bodyMarkdown") ?? "");
  const item = await getContentItem(id);
  if (!item) throw new Error("Content not found.");
  await updateContentItem(id, { body_markdown: body, status: "visual" }, admin, {
    logType: "stage_change",
    detail: "Confirmed master draft",
  });
  await seedVariantsFromDraft({ ...item, bodyMarkdown: body }, admin);
  revalidateItem(id);
}

// --- Platform variants -----------------------------------------------------
export async function adaptVariantAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const platform = text(formData, "platform");
  if (!isPlatform(platform)) throw new Error("Unknown platform.");
  const item = await getContentItem(id);
  if (!item) throw new Error("Content not found.");
  const variant = item.variants.find((v) => v.platform === platform);
  const template = variant?.templateId ? await getTemplate(variant.templateId) : null;
  const editorial = template?.editorial as { tone?: string; textLimit?: number; hashtagPolicy?: string; format?: string } | undefined;
  const result = await adaptForPlatform({
    platform,
    master: item.bodyMarkdown,
    title: item.title,
    editorial,
  });
  await upsertVariant(id, platform, {
    body: result.body,
    caption: result.caption,
    hashtags: result.hashtags,
  });
  revalidateItem(id);
}

export async function saveVariantAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const platform = text(formData, "platform");
  if (!isPlatform(platform)) throw new Error("Unknown platform.");
  await upsertVariant(id, platform, {
    body: String(formData.get("body") ?? ""),
    caption: text(formData, "caption"),
    hashtags: tagList(formData, "hashtags"),
    status: text(formData, "status") || "draft",
    templateId: text(formData, "templateId") || null,
  });
  revalidateItem(id);
}

// --- Visual studio ---------------------------------------------------------
export async function generateImageAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const prompt = text(formData, "prompt");
  const size = (text(formData, "size") as `${number}x${number}`) || "1024x1024";
  if (!prompt) throw new Error("Add a prompt.");
  const image = await generateMarketingImage({ prompt, size });
  const assetId = await recordAsset({
    contentItemId: id,
    kind: "ai_generated",
    storagePath: image.storagePath,
    publicUrl: image.publicUrl,
    mime: image.mime,
    prompt,
    createdByName: admin.name,
  });
  revalidateItem(id);
  return assetId;
}

/**
 * Import an image the admin pasted a URL for. This runs server-side on purpose:
 * fetching the image in the browser is blocked by CORS on most image hosts.
 */
export async function importImageAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const url = text(formData, "url");
  if (!url) throw new Error("Add an image URL.");
  const media = await importFromUrl(url);
  const assetId = await recordAsset({
    contentItemId: id,
    kind: "upload",
    storagePath: media.storagePath,
    publicUrl: media.publicUrl,
    mime: media.mime,
    sourceUrl: url,
    createdByName: admin.name,
  });
  revalidateItem(id);
  return assetId;
}

// --- Approval / publish ----------------------------------------------------
export async function approveContentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const item = await getContentItem(id);
  if (!item) throw new Error("Content not found.");
  const ready = readyPlatforms(item.variants);
  if (!ready.length) {
    throw new Error("Mark at least one platform variant as Ready before approving.");
  }
  if (["approved", "scheduled", "published"].includes(item.status)) {
    throw new Error("This content has already been approved.");
  }
  await moveContentStage(id, "approved", admin);
  const notify = await notifyAdminsContentReady({
    itemId: id,
    title: item.title,
    approvedBy: admin.name,
    platforms: ready.map((platform) => PLATFORM_META[platform].label),
  });
  await addContentNote(id, `Notified ${notify.notified}/${notify.total} admins that content is ready to post.`, admin);
  revalidateItem(id);
  revalidatePath("/admin/marketing/ready");
}

export async function publishContentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  await moveContentStage(id, "published", admin);
  revalidateItem(id);
  revalidatePath("/admin/marketing/ready");
}

export async function scheduleContentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  if (!id) throw new Error("Missing content id.");
  // The picker submits an ISO instant so the stored timestamptz matches the
  // admin's timezone rather than the server's.
  const scheduledAt = text(formData, "scheduledAt");
  const when = scheduledAt ? new Date(scheduledAt) : null;
  if (scheduledAt && Number.isNaN(when?.getTime())) throw new Error("Invalid schedule date.");
  const iso = when ? when.toISOString() : null;
  await updateContentItem(id, { scheduled_at: iso }, admin, {
    logType: "note",
    detail: iso ? `Scheduled for ${iso}` : "Cleared the schedule",
  });
  if (iso) {
    const item = await getContentItem(id);
    if (item?.status === "approved") {
      await moveContentStage(id, "scheduled", admin);
    }
  } else {
    const item = await getContentItem(id);
    if (item?.status === "scheduled") await moveContentStage(id, "approved", admin);
  }
  revalidateItem(id);
}

// --- Newsletter (email variant) -------------------------------------------
export async function prepareNewsletterAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const item = await getContentItem(id);
  if (!item) throw new Error("Content not found.");
  const emailVariant = item.variants.find((v) => v.platform === "email");
  const sendId = await createEmailSend({
    contentItemId: id,
    variantId: emailVariant?.id ?? null,
    subject: text(formData, "subject") || item.title,
    previewText: text(formData, "previewText") || item.summary,
    fromName: text(formData, "fromName") || "Physical I/O",
    replyTo: text(formData, "replyTo"),
    body: emailVariant?.body || item.bodyMarkdown,
    scheduledAt: text(formData, "scheduledAt") || null,
    createdByName: admin.name,
  });
  revalidateItem(id);
  return sendId;
}

export async function newsletterTestAction(formData: FormData) {
  const admin = await requireAdmin();
  const sendId = text(formData, "sendId");
  const toEmail = text(formData, "toEmail");
  if (!sendId || !toEmail) throw new Error("Missing send or test email.");
  await sendNewsletterTest(sendId, toEmail, admin);
}

export async function newsletterSendAction(formData: FormData) {
  const admin = await requireAdmin();
  const sendId = text(formData, "sendId");
  const id = text(formData, "id");
  if (!sendId) throw new Error("Missing send.");
  await sendNewsletter(sendId, admin);
  if (id) revalidateItem(id);
}

// --- Templates -------------------------------------------------------------
export async function createTemplateAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = text(formData, "name");
  if (!name) throw new Error("Add a template name.");
  const platformFormats = Object.fromEntries(
    (Object.keys(PLATFORM_META) as Platform[]).map((p) => [p, PLATFORM_META[p].canvas]),
  );
  await createTemplate(
    {
      name,
      description: text(formData, "description"),
      layout: { logo: true, title: { position: "bottom-left", scale: 1 }, imageSlots: 1 },
      platformFormats,
      editorial: { tone: text(formData, "tone"), textLimit: Number(text(formData, "textLimit")) || undefined },
    },
    admin,
  );
  revalidatePath("/admin/marketing/templates");
}

export async function updateTemplateAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) throw new Error("Missing template id.");
  const name = text(formData, "name");
  if (!name) throw new Error("Add a template name.");
  await updateTemplate(id, {
    name,
    description: text(formData, "description"),
    editorial: { tone: text(formData, "tone"), textLimit: Number(text(formData, "textLimit")) || undefined },
  });
  revalidatePath("/admin/marketing/templates");
}

export async function deleteTemplateAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (id) await deleteTemplate(id);
  revalidatePath("/admin/marketing/templates");
}
