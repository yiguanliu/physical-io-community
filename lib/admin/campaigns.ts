import { SITE_URL } from "@/lib/site";
import { parseAudienceFilter, resolveAudience, skipReasonForMember, type AudienceFilter } from "@/lib/admin/audience";
import {
  deleteRows,
  findCampaignEvent,
  findCampaignRecipient,
  getAllAudienceMembers,
  getCampaign,
  getRawMember,
  insertRows,
  updateCampaignRows,
  writeAudit,
} from "@/lib/admin/store";
import { createId, nowIso } from "@/lib/db/ids";
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
  await insertRows("campaign_events", {
    id: createId(),
    campaign_id: campaignId,
    type: "test_sent",
    payload: { to: toEmail, provider: result.provider, id: result.id },
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
    const campaign = await getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found.");
    if (campaign.status === "sent") throw new Error("This campaign was already sent.");
    if (campaign.status === "sending") throw new Error("This campaign is already sending.");
    const filter = parseAudienceFilter(campaign.audienceFilter);
    filter.campaignType = (campaign.type as AudienceFilter["campaignType"]) ?? "newsletter";
    const people = await getAllAudienceMembers();
    const { eligible, skipped } = resolveAudience(people, filter);
    if (!eligible.length) throw new Error("No eligible recipients. Check consent and filters.");

    await updateCampaignRows("campaigns", {
      status: "sending",
      updated_at: nowIso(),
      recipient_count: eligible.length,
      skip_count: skipped.length,
    }, campaignId);
    await deleteRows("campaign_recipients", "campaign_id", campaignId);

    for (const member of skipped) {
      await insertRows("campaign_recipients", {
        id: createId(),
        campaign_id: campaignId,
        member_id: member.member.id,
        email: member.member.email,
        name: member.member.fullName,
        status: "skipped",
        skip_reason: member.reason,
      });
    }

    let sent = 0;
    let failed = 0;
    for (const member of eligible) {
      const recipientId = createId();
      const latest = await getRawMember(member.id);
      const liveMember = latest ? { ...member, emailStatus: latest.emailStatus, status: latest.status } : member;
      const liveReason = skipReasonForMember(liveMember, filter);
      if (liveReason) {
        await insertRows("campaign_recipients", {
          id: recipientId,
          campaign_id: campaignId,
          member_id: member.id,
          email: member.email,
          name: member.fullName,
          status: "skipped",
          skip_reason: liveReason,
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
        await insertRows("campaign_recipients", {
          id: recipientId,
          campaign_id: campaignId,
          member_id: member.id,
          email: member.email,
          name: member.fullName,
          status: result.provider === "resend" ? "sent" : "delivered",
          provider_id: result.id,
          sent_at: timestamp,
        });
        await updateCampaignRows("members", { last_contacted_at: timestamp, updated_at: timestamp }, member.id);
        sent += 1;
      } catch (error) {
        failed += 1;
        await insertRows("campaign_recipients", {
          id: recipientId,
          campaign_id: campaignId,
          member_id: member.id,
          email: member.email,
          name: member.fullName,
          status: "failed",
          skip_reason: error instanceof Error ? error.message : "send_failed",
        });
      }
    }

    const timestamp = nowIso();
    await insertRows("campaign_events", {
      id: createId(),
      campaign_id: campaignId,
      type: "sent",
      payload: { sent, failed, skipped: skipped.length, provider: process.env.RESEND_API_KEY ? "resend" : "local" },
    });
    await updateCampaignRows("campaigns", {
      status: failed && !sent ? "failed" : "sent",
      sent_at: timestamp,
      updated_at: timestamp,
      recipient_count: sent,
      skip_count: skipped.length + failed,
    }, campaignId);
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
  const existing = await findCampaignEvent(input.providerEventId);
  if (existing) return { duplicate: true };

  const recipient = await findCampaignRecipient({ providerId: input.providerId, email: input.email });
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
    await updateCampaignRows("campaign_recipients", {
      status: nextStatus,
      opened_at: input.type === "opened" ? timestamp : recipient.openedAt,
      clicked_at: input.type === "clicked" ? timestamp : recipient.clickedAt,
    }, recipient.id);
  }
  if (recipient.memberId && (input.type === "bounced" || input.type === "complained" || input.type === "unsubscribed")) {
    await updateCampaignRows("members", {
      email_status: input.type === "unsubscribed" ? "unsubscribed" : input.type,
      updated_at: timestamp,
    }, recipient.memberId);
  }
  await insertRows("campaign_events", {
    id: createId(),
    campaign_id: recipient.campaignId,
    recipient_id: recipient.id,
    type: input.type,
    provider_event_id: input.providerEventId,
    payload: input.payload ?? {},
  });
  return { recorded: true };
}
