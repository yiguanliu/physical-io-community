import { renderEmailHtml } from "./template";
import { Resend } from "resend";
import { personalise } from "@/lib/admin/audience";

export type SendEmailInput = {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  /** Pre-rendered body HTML. When omitted, `text` is escaped into paragraphs. */
  html?: string;
  fromName?: string;
  replyTo?: string;
  campaignId?: string;
  unsubscribeUrl?: string;
};

export type SendEmailResult = {
  provider: "resend" | "local";
  id: string;
};

export const RESEND_CONFIGURATION_ERROR =
  "Email sending is not configured. Set RESEND_API_KEY and RESEND_FROM to a verified Resend sender, then redeploy.";

export { escapeHtml, renderEmailHtml } from "./template";

export function getFromAddress(fromName = "Physical I/O") {
  return process.env.RESEND_FROM || `${fromName} <updates@physical-io.com>`;
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function requireResendConfigured() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(RESEND_CONFIGURATION_ERROR);
  }
  return process.env.RESEND_API_KEY;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const html = renderEmailHtml({
    previewText: input.subject,
    body: input.text,
    bodyHtml: input.html,
    unsubscribeUrl: input.unsubscribeUrl,
  });
  const resend = new Resend(requireResendConfigured());
  const { data, error } = await resend.emails.send({
    from: getFromAddress(input.fromName),
    to: input.to,
    subject: input.subject,
    html,
    text: input.text,
    replyTo: input.replyTo || undefined,
    headers: input.campaignId ? { "X-Physical-IO-Campaign": input.campaignId } : undefined,
  });
  if (error || !data?.id) {
    throw new Error(error?.message || "Resend did not accept the email.");
  }
  return { provider: "resend", id: data.id };
}

export function renderMemberEmail(
  template: string,
  member: { firstName: string; fullName: string; email: string; city: string },
) {
  return personalise(template, member);
}
