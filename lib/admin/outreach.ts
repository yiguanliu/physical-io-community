import { getLead, getRawOutreachMessage, insertRows, updateCampaignRows, writeAudit } from "@/lib/admin/store";
import { createId, nowIso } from "@/lib/db/ids";
import { sendEmail } from "@/lib/email/send";

export async function sendOutreachMessage(messageId: string, actor: { id?: string; name: string }) {
  const message = await getRawOutreachMessage(messageId);
  if (!message) throw new Error("Message not found.");
  if (message.status === "sent") throw new Error("This outreach message was already sent.");
  const lead = await getLead(message.leadId);
  if (!lead) throw new Error("Lead not found.");
  const result = await sendEmail({
    to: message.toEmail,
    toName: message.toName,
    subject: message.subject,
    text: message.body,
    fromName: "Physical I/O",
  });
  const timestamp = nowIso();
  await updateCampaignRows("outreach_messages", {
    status: "sent",
    provider_id: result.id,
    sent_at: timestamp,
    updated_at: timestamp,
  }, messageId);
  await updateCampaignRows("leads", {
    status: lead.status === "research" ? "contacted" : lead.status,
    last_activity_at: timestamp,
    updated_at: timestamp,
  }, lead.id);
  await insertRows("lead_activities", {
    id: createId(),
    lead_id: lead.id,
    type: "email",
    title: `Email sent: ${message.subject}`,
    detail: `To ${message.toName} <${message.toEmail}> via ${result.provider}`,
    created_by_name: actor.name,
  });
  await writeAudit({
    actorUserId: actor.id,
    actorName: actor.name,
    action: "outreach.send",
    entityType: "lead",
    entityId: lead.id,
    summary: `Sent outreach to ${message.toEmail}`,
  });
  return result;
}
