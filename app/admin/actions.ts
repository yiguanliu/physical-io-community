"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMemberCsv, type AudienceFilter } from "@/lib/admin/audience";
import { previewAudience, sendCampaign, sendTestCampaign } from "@/lib/admin/campaigns";
import { sendOutreachMessage } from "@/lib/admin/outreach";
import {
  addLeadNote,
  completeNextAction,
  createLead,
  importMemberRows,
  saveCampaign,
  saveEvent,
  saveOutreachDraft,
  setMemberSubscription,
  updateLeadStatus,
  upsertMember,
} from "@/lib/admin/store";
import { requireAdmin } from "@/lib/auth/session";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function revalidateAdmin() {
  revalidatePath("/admin");
}

export async function createMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = await upsertMember(
    {
      email: text(formData, "email"),
      fullName: text(formData, "fullName"),
      city: text(formData, "city"),
      professionalRole: text(formData, "professionalRole"),
      experienceRange: text(formData, "experienceRange"),
      websiteUrl: text(formData, "websiteUrl"),
      linkedinUrl: text(formData, "linkedinUrl"),
      status: text(formData, "status") || "active",
      notes: text(formData, "notes"),
      interests: text(formData, "interests")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      newsletterConsent: formData.get("newsletterConsent") === "on",
    },
    admin,
  );
  revalidateAdmin();
  redirect(`/admin/members/${id}`);
}

export async function updateMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  await upsertMember(
    {
      id,
      email: text(formData, "email"),
      fullName: text(formData, "fullName"),
      city: text(formData, "city"),
      professionalRole: text(formData, "professionalRole"),
      experienceRange: text(formData, "experienceRange"),
      websiteUrl: text(formData, "websiteUrl"),
      linkedinUrl: text(formData, "linkedinUrl"),
      status: text(formData, "status") || "active",
      notes: text(formData, "notes"),
      interests: text(formData, "interests")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    },
    admin,
  );
  const topics = ["newsletter", "events", "announcements"] as const;
  for (const topic of topics) {
    const status = text(formData, `sub_${topic}`);
    if (status) await setMemberSubscription(id, topic, status as "subscribed" | "unsubscribed" | "consent_unknown");
  }
  revalidatePath(`/admin/members/${id}`);
  revalidateAdmin();
}

export async function importMembersAction(formData: FormData) {
  const admin = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to import.");
  const parsed = parseMemberCsv(await file.text());
  const result = await importMemberRows(parsed.rows, admin);
  revalidateAdmin();
  return { ...result, parseErrors: parsed.errors };
}

export async function saveCampaignAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id") || undefined;
  const audience: AudienceFilter = {
    campaignType: (text(formData, "type") || "newsletter") as AudienceFilter["campaignType"],
    requireConsent: formData.get("requireConsent") === "on",
    statuses: text(formData, "statuses")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    cities: text(formData, "cities")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    roles: text(formData, "roles")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    interests: text(formData, "interests")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };
  const savedId = await saveCampaign(
    {
      id,
      name: text(formData, "name"),
      type: text(formData, "type") || "newsletter",
      subject: text(formData, "subject"),
      previewText: text(formData, "previewText"),
      fromName: text(formData, "fromName") || "Physical I/O",
      replyTo: text(formData, "replyTo"),
      body: text(formData, "body"),
      audienceFilter: audience,
      eventId: text(formData, "eventId") || null,
    },
    admin,
  );
  revalidateAdmin();
  redirect(`/admin/campaigns/${savedId}`);
}

export async function previewAudienceAction(filter: AudienceFilter) {
  await requireAdmin();
  return previewAudience(filter);
}

export async function sendTestCampaignAction(formData: FormData) {
  const admin = await requireAdmin();
  await sendTestCampaign(text(formData, "id"), text(formData, "testEmail") || admin.email, admin);
  revalidatePath(`/admin/campaigns/${text(formData, "id")}`);
  return { ok: true };
}

export async function sendCampaignAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const result = await sendCampaign(id, admin);
  revalidateAdmin();
  revalidatePath(`/admin/campaigns/${id}`);
  return result;
}

export async function createLeadAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = await createLead(
    {
      company: text(formData, "company"),
      website: text(formData, "website"),
      industry: text(formData, "industry"),
      contactName: text(formData, "contactName"),
      contactEmail: text(formData, "contactEmail"),
      contactRole: text(formData, "contactRole"),
      estimatedValueGbp: Number(text(formData, "estimatedValueGbp") || "0"),
      fitScore: Number(text(formData, "fitScore") || "50"),
      nextAction: text(formData, "nextAction"),
    },
    admin,
  );
  revalidateAdmin();
  redirect(`/admin/outreach?lead=${id}`);
}

export async function updateLeadStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  await updateLeadStatus(text(formData, "id"), text(formData, "status"), admin);
  revalidateAdmin();
}

export async function addLeadNoteAction(formData: FormData) {
  const admin = await requireAdmin();
  await addLeadNote(text(formData, "id"), text(formData, "note"), admin);
  revalidateAdmin();
}

export async function completeNextActionAction(formData: FormData) {
  const admin = await requireAdmin();
  await completeNextAction(text(formData, "id"), admin);
  revalidateAdmin();
}

export async function saveOutreachDraftAction(formData: FormData) {
  const admin = await requireAdmin();
  const messageId = await saveOutreachDraft(
    {
      leadId: text(formData, "leadId"),
      subject: text(formData, "subject"),
      body: text(formData, "body"),
      toEmail: text(formData, "toEmail"),
      toName: text(formData, "toName"),
    },
    admin,
  );
  await sendOutreachMessage(messageId, admin);
  revalidateAdmin();
  return { ok: true };
}

export async function saveEventAction(formData: FormData) {
  await requireAdmin();
  await saveEvent({
    id: text(formData, "id") || undefined,
    title: text(formData, "title"),
    description: text(formData, "description"),
    venue: text(formData, "venue"),
    startsAt: new Date(text(formData, "startsAt")).toISOString(),
    status: text(formData, "status") || "draft",
    registrationUrl: text(formData, "registrationUrl"),
    registeredCount: Number(text(formData, "registeredCount") || "0"),
  });
  revalidateAdmin();
}

export async function approveAccessAction(formData: FormData) {
  const admin = await requireAdmin();
  const { setUserRole } = await import("@/lib/admin/access");
  await setUserRole({ userId: text(formData, "userId"), role: "admin", actor: admin });
  revalidatePath("/admin/access");
}

export async function declineAccessAction(formData: FormData) {
  const admin = await requireAdmin();
  const { setUserRole } = await import("@/lib/admin/access");
  await setUserRole({ userId: text(formData, "userId"), role: "denied", actor: admin });
  revalidatePath("/admin/access");
}
