// Dedicated newsletter sender for the Marketing Content Studio email variant.
// Independent of the campaigns table, but reuses the consent-aware audience
// resolution and the Resend send infra. Records against content_email_* tables.

import { parseAudienceFilter, resolveAudience, skipReasonForMember } from "@/lib/admin/audience";
import { getAllAudienceMembers, getRawMember, writeAudit } from "@/lib/admin/store";
import { addContentNote, getEmailSend, insertEmailRecipients, updateEmailSend } from "@/lib/admin/content-studio";
import { createId, nowIso } from "@/lib/db/ids";
import { markdownToHtml, markdownToPlainText } from "@/lib/marketing/markdown";
import { renderMemberEmail, requireResendConfigured, sendEmail } from "@/lib/email/send";
import { SITE_URL } from "@/lib/site";

const SEND_LOCKS = new Set<string>();

function unsubscribeUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  return `${base.replace(/\/$/, "")}/unsubscribe?token=${token}`;
}

/** The studio stores Markdown; subscribers need rendered HTML + a plain-text part. */
function renderBody(markdown: string) {
  return { html: markdownToHtml(markdown), text: markdownToPlainText(markdown) };
}

export async function sendNewsletterTest(sendId: string, toEmail: string, actor: { id?: string; name: string }) {
  const send = await getEmailSend(sendId);
  if (!send) throw new Error("Email send not found.");
  const personalised = renderMemberEmail(send.body, {
    firstName: actor.name.split(" ")[0] || "there",
    fullName: actor.name,
    email: toEmail,
    city: "London",
  });
  const body = renderBody(personalised);
  const result = await sendEmail({
    to: toEmail,
    subject: `[TEST] ${send.subject}`,
    text: body.text,
    html: body.html,
    fromName: send.fromName,
    replyTo: send.replyTo,
  });
  // Only a draft advances to "test" — overwriting a "sent"/"sending" send here
  // would clear the guard in sendNewsletter and allow a duplicate mass send.
  if (send.status === "draft") await updateEmailSend(sendId, { status: "test" });
  await addContentNote(send.contentItemId, `Sent a newsletter test to ${toEmail}`, actor);
  await writeAudit({
    actorUserId: actor.id,
    actorName: actor.name,
    action: "content.email.test",
    entityType: "content_email_send",
    entityId: sendId,
    summary: `Sent newsletter test to ${toEmail}`,
  });
  return result;
}

export async function sendNewsletter(sendId: string, actor: { id?: string; name: string }) {
  if (SEND_LOCKS.has(sendId)) throw new Error("This newsletter is already sending.");
  SEND_LOCKS.add(sendId);
  try {
    const send = await getEmailSend(sendId);
    if (!send) throw new Error("Email send not found.");
    if (send.status === "sent") throw new Error("This newsletter was already sent.");
    if (send.status === "sending") throw new Error("This newsletter is already sending.");

    const filter = parseAudienceFilter(null);
    filter.campaignType = "newsletter";
    const people = await getAllAudienceMembers();
    const { eligible, skipped } = resolveAudience(people, filter);
    if (!eligible.length) throw new Error("No eligible recipients. Check consent and suppression.");
    requireResendConfigured();

    await updateEmailSend(sendId, {
      status: "sending",
      recipient_count: eligible.length,
      skip_count: skipped.length,
    });

    const skippedRows = skipped.map((entry) => ({
      id: createId(),
      send_id: sendId,
      member_id: entry.member.id,
      email: entry.member.email,
      name: entry.member.fullName,
      status: "skipped",
      skip_reason: entry.reason,
      created_at: nowIso(),
    }));
    await insertEmailRecipients(skippedRows);

    let sent = 0;
    let failed = 0;
    for (const member of eligible) {
      const latest = await getRawMember(member.id);
      const liveMember = latest ? { ...member, emailStatus: latest.emailStatus, status: latest.status } : member;
      const liveReason = skipReasonForMember(liveMember, filter);
      if (liveReason) {
        await insertEmailRecipients([{
          id: createId(),
          send_id: sendId,
          member_id: member.id,
          email: member.email,
          name: member.fullName,
          status: "skipped",
          skip_reason: liveReason,
          created_at: nowIso(),
        }]);
        continue;
      }
      try {
        const body = renderBody(renderMemberEmail(send.body, member));
        const result = await sendEmail({
          to: member.email,
          toName: member.fullName,
          subject: send.subject,
          text: body.text,
          html: body.html,
          fromName: send.fromName,
          replyTo: send.replyTo,
          unsubscribeUrl: latest ? unsubscribeUrl(latest.unsubscribeToken) : undefined,
        });
        await insertEmailRecipients([{
          id: createId(),
          send_id: sendId,
          member_id: member.id,
          email: member.email,
          name: member.fullName,
          status: result.provider === "resend" ? "sent" : "delivered",
          provider_id: result.id,
          sent_at: nowIso(),
          created_at: nowIso(),
        }]);
        sent += 1;
      } catch (error) {
        failed += 1;
        await insertEmailRecipients([{
          id: createId(),
          send_id: sendId,
          member_id: member.id,
          email: member.email,
          name: member.fullName,
          status: "failed",
          skip_reason: error instanceof Error ? error.message : "send_failed",
          created_at: nowIso(),
        }]);
      }
    }

    await updateEmailSend(sendId, {
      status: failed && !sent ? "failed" : "sent",
      sent_at: nowIso(),
      recipient_count: sent,
      skip_count: skipped.length + failed,
    });
    await addContentNote(
      send.contentItemId,
      `Newsletter sent to ${sent} subscriber${sent === 1 ? "" : "s"} (${skipped.length} skipped, ${failed} failed)`,
      actor,
    );
    await writeAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      action: "content.email.send",
      entityType: "content_email_send",
      entityId: sendId,
      summary: `Sent newsletter to ${sent} members (${skipped.length} skipped, ${failed} failed)`,
    });
    return { sent, failed, skipped: skipped.length };
  } finally {
    SEND_LOCKS.delete(sendId);
  }
}
