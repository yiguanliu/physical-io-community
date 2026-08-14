import { eq } from "drizzle-orm";
import { SITE_URL } from "@/lib/site";
import { parseAudienceFilter, resolveAudience, skipReasonForMember, type AudienceFilter } from "@/lib/admin/audience";
import { getAllAudienceMembers, getCampaign, writeAudit } from "@/lib/admin/store";
import { readyDb } from "@/lib/db/client";
import { createId, nowIso } from "@/lib/db/ids";
import { campaignEvents, campaignRecipients, campaigns, members } from "@/lib/db/schema";
import { renderMemberEmail, sendEmail } from "@/lib/email/send";

const SEND_LOCKS = new Set<string>();

function unsubscribeUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  return `${base.replace(/\/$/, "")}/unsubscribe?token=${token}`;
}

export async function previewAudience(filter: AudienceFilter) {
  const people = await getAllAudienceMembers();
  const { eligible, skipped } = resolveAudience(people, filter);
  return { eligibleCount: eligible.length, skippedCount: skipped.length, sample: eligible.slice(0, 8) };
}

export async function sendTestCampaign(campaignId: string, toEmail: string, actor: { id?: string; name: string }) {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  const body = renderMemberEmail(campaign.body, {
    firstName: actor.name.split(" ")[0] || "there",
    fullName: actor.name,
    email: toEmail,
    city: "London",
  });
  const result = await sendEmail({
    to: toEmail,
    subject: `[TEST] ${campaign.subject}`,
    text: body,
    fromName: campaign.fromName,
    replyTo: campaign.replyTo,
    campaignId,
  });
  const db = await readyDb();
  await db.insert(campaignEvents).values({
    id: createId(),
    campaignId,
    type: "test_sent",
    payload: JSON.stringify({ to: toEmail, provider: result.provider, id: result.id }),
  });
  await writeAudit({
    actorUserId: actor.id,
    actorName: actor.name,
    action: "campaign.test",
    entityType: "campaign",
    entityId: campaignId,
    summary: `Sent test to ${toEmail}`,
  });
  return result;
}

export async function sendCampaign(campaignId: string, actor: { id?: string; name: string }) {
  if (SEND_LOCKS.has(campaignId)) throw new Error("This campaign is already sending.");
  SEND_LOCKS.add(campaignId);
  try {
    const db = await readyDb();
    const campaign = await getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found.");
    if (campaign.status === "sent") throw new Error("This campaign was already sent.");
    if (campaign.status === "sending") throw new Error("This campaign is already sending.");
    const filter = parseAudienceFilter(campaign.audienceFilter);
    filter.campaignType = (campaign.type as AudienceFilter["campaignType"]) ?? "newsletter";
    const people = await getAllAudienceMembers();
    const { eligible, skipped } = resolveAudience(people, filter);
    if (!eligible.length) throw new Error("No eligible recipients. Check consent and filters.");

    await db
      .update(campaigns)
      .set({ status: "sending", updatedAt: nowIso(), recipientCount: eligible.length, skipCount: skipped.length })
      .where(eq(campaigns.id, campaignId));

    await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, campaignId));

    for (const member of skipped) {
      await db.insert(campaignRecipients).values({
        id: createId(),
        campaignId,
        memberId: member.member.id,
        email: member.member.email,
        name: member.member.fullName,
        status: "skipped",
        skipReason: member.reason,
      });
    }

    let sent = 0;
    let failed = 0;
    for (const member of eligible) {
      const recipientId = createId();
      const latest = (await db.select().from(members).where(eq(members.id, member.id)).limit(1))[0];
      const liveMember = latest
        ? { ...member, emailStatus: latest.emailStatus, status: latest.status }
        : member;
      const liveReason = skipReasonForMember(liveMember, filter);
      if (liveReason) {
        await db.insert(campaignRecipients).values({
          id: recipientId,
          campaignId,
          memberId: member.id,
          email: member.email,
          name: member.fullName,
          status: "skipped",
          skipReason: liveReason,
        });
        continue;
      }
      try {
        const text = renderMemberEmail(campaign.body, member);
        const result = await sendEmail({
          to: member.email,
          toName: member.fullName,
          subject: campaign.subject,
          text,
          fromName: campaign.fromName,
          replyTo: campaign.replyTo,
          campaignId,
          unsubscribeUrl: latest ? unsubscribeUrl(latest.unsubscribeToken) : undefined,
        });
        const timestamp = nowIso();
        await db.insert(campaignRecipients).values({
          id: recipientId,
          campaignId,
          memberId: member.id,
          email: member.email,
          name: member.fullName,
          status: result.provider === "resend" ? "sent" : "delivered",
          providerId: result.id,
          sentAt: timestamp,
        });
        await db.update(members).set({ lastContactedAt: timestamp, updatedAt: timestamp }).where(eq(members.id, member.id));
        sent += 1;
      } catch (error) {
        failed += 1;
        await db.insert(campaignRecipients).values({
          id: recipientId,
          campaignId,
          memberId: member.id,
          email: member.email,
          name: member.fullName,
          status: "failed",
          skipReason: error instanceof Error ? error.message : "send_failed",
        });
      }
    }

    const timestamp = nowIso();
    await db.insert(campaignEvents).values({
      id: createId(),
      campaignId,
      type: "sent",
      payload: JSON.stringify({ sent, failed, skipped: skipped.length, provider: process.env.RESEND_API_KEY ? "resend" : "local" }),
    });
    await db
      .update(campaigns)
      .set({
        status: failed && !sent ? "failed" : "sent",
        sentAt: timestamp,
        updatedAt: timestamp,
        recipientCount: sent,
        skipCount: skipped.length + failed,
      })
      .where(eq(campaigns.id, campaignId));
    await writeAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      action: "campaign.send",
      entityType: "campaign",
      entityId: campaignId,
      summary: `Sent ${campaign.name} to ${sent} members (${skipped.length} skipped, ${failed} failed)`,
    });
    return { sent, failed, skipped: skipped.length };
  } finally {
    SEND_LOCKS.delete(campaignId);
  }
}

export async function recordProviderEvent(input: {
  providerEventId: string;
  type: string;
  email?: string;
  providerId?: string;
  payload?: unknown;
}) {
  const db = await readyDb();
  const existing = await db.select().from(campaignEvents).where(eq(campaignEvents.providerEventId, input.providerEventId)).limit(1);
  if (existing[0]) return { duplicate: true };

  const recipient = input.providerId
    ? (await db.select().from(campaignRecipients).where(eq(campaignRecipients.providerId, input.providerId)).limit(1))[0]
    : input.email
      ? (await db.select().from(campaignRecipients).where(eq(campaignRecipients.email, input.email)).limit(1))[0]
      : undefined;
  if (!recipient) return { ignored: true };

  const statusMap: Record<string, string> = {
    delivered: "delivered",
    bounced: "bounced",
    complained: "complained",
    opened: "opened",
    clicked: "clicked",
    unsubscribed: "unsubscribed",
  };
  const nextStatus = statusMap[input.type];
  const timestamp = nowIso();
  if (nextStatus) {
    await db
      .update(campaignRecipients)
      .set({
        status: nextStatus,
        openedAt: input.type === "opened" ? timestamp : recipient.openedAt,
        clickedAt: input.type === "clicked" ? timestamp : recipient.clickedAt,
      })
      .where(eq(campaignRecipients.id, recipient.id));
  }
  if (recipient.memberId && (input.type === "bounced" || input.type === "complained" || input.type === "unsubscribed")) {
    await db
      .update(members)
      .set({
        emailStatus: input.type === "unsubscribed" ? "unsubscribed" : input.type,
        updatedAt: timestamp,
      })
      .where(eq(members.id, recipient.memberId));
  }
  await db.insert(campaignEvents).values({
    id: createId(),
    campaignId: recipient.campaignId,
    recipientId: recipient.id,
    type: input.type,
    providerEventId: input.providerEventId,
    payload: JSON.stringify(input.payload ?? {}),
  });
  return { recorded: true };
}
