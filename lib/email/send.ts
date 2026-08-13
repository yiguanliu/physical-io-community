import { Resend } from "resend";
import { personalise } from "@/lib/admin/audience";

export type SendEmailInput = {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  fromName?: string;
  replyTo?: string;
  campaignId?: string;
  unsubscribeUrl?: string;
};

export type SendEmailResult = {
  provider: "resend" | "local";
  id: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderEmailHtml(input: {
  previewText?: string;
  body: string;
  unsubscribeUrl?: string;
}) {
  const paragraphs = escapeHtml(input.body)
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#171714;">${block.replaceAll("\n", "<br/>")}</p>`)
    .join("");
  const unsubscribe = input.unsubscribeUrl
    ? `<p style="margin:24px 0 0;font-size:12px;color:#77766f;">If you no longer want these emails, <a href="${input.unsubscribeUrl}" style="color:#ee4b1a;">unsubscribe</a>.</p>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f3f2ed;padding:24px;font-family:Inter,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.previewText ?? "")}</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border:1px solid #deddd6;border-radius:12px;padding:32px;">
          <tr><td style="font-size:12px;letter-spacing:.14em;font-weight:700;color:#ee4b1a;padding-bottom:18px;">PHYSICAL I/O</td></tr>
          <tr><td>${paragraphs}</td></tr>
          <tr><td>${unsubscribe}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function getFromAddress(fromName = "Physical I/O") {
  return process.env.RESEND_FROM || `${fromName} <updates@physical-io.com>`;
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const html = renderEmailHtml({
    previewText: input.subject,
    body: input.text,
    unsubscribeUrl: input.unsubscribeUrl,
  });
  if (!process.env.RESEND_API_KEY) {
    console.info(`[email:local] to=${input.to} subject=${input.subject}`);
    return { provider: "local", id: `local_${crypto.randomUUID()}` };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
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
