import { eq } from "drizzle-orm";
import { getLead, writeAudit } from "@/lib/admin/store";
import { readyDb } from "@/lib/db/client";
import { createId, nowIso } from "@/lib/db/ids";
import { leadActivities, leads, outreachMessages } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";

export async function sendOutreachMessage(messageId: string, actor: { id?: string; name: string }) {
  const db = await readyDb();
  const [message] = await db.select().from(outreachMessages).where(eq(outreachMessages.id, messageId)).limit(1);
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
  await db
    .update(outreachMessages)
    .set({ status: "sent", providerId: result.id, sentAt: timestamp, updatedAt: timestamp })
    .where(eq(outreachMessages.id, messageId));
  await db.update(leads).set({
    status: lead.status === "research" ? "contacted" : lead.status,
    lastActivityAt: timestamp,
    updatedAt: timestamp,
  }).where(eq(leads.id, lead.id));
  await db.insert(leadActivities).values({
    id: createId(),
    leadId: lead.id,
    type: "email",
    title: `Email sent: ${message.subject}`,
    detail: `To ${message.toName} <${message.toEmail}> via ${result.provider}`,
    createdByName: actor.name,
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
