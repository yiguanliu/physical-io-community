import { NextResponse } from "next/server";
import { RESEND_CONFIGURATION_ERROR } from "@/lib/email/send";

// Physical I/O team inboxes that receive "Ask Us Anything" submissions.
// Kept server-side only so the addresses are never shipped to the browser.
const RECIPIENTS = [
  "soul@physical-io.com",
  "sylvan@physical-io.com",
  "anthony@physical-io.com",
];

const FROM_EMAIL = process.env.ASK_FROM_EMAIL || "Physical I/O <ask@physical-io.com>";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ParsedAsk = {
  name: string;
  email: string;
  category: string;
  message: string;
  company: string; // honeypot
};

// Lightweight validation (no schema library) so the route stays dependency-free.
function parseAsk(body: unknown): { data: ParsedAsk } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Please check the form and try again." };
  }

  const raw = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const name = str(raw.name);
  const email = str(raw.email);
  const category = str(raw.category);
  const message = str(raw.message);
  const company = str(raw.company);

  if (!name) return { error: "Please share your name." };
  if (name.length > 120) return { error: "That name is too long." };
  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return { error: "Please enter a valid email address." };
  }
  if (!category || category.length > 80) {
    return { error: "Please choose what this is about." };
  }
  if (!message) return { error: "Please tell us what you'd like to learn about." };
  if (message.length > 4000) return { error: "That message is too long." };

  return { data: { name, email, category, message, company } };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseAsk(body);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { name, email, category, message, company } = parsed.data;

  // Honeypot tripped — pretend success so bots get no signal.
  if (company) {
    return NextResponse.json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error(RESEND_CONFIGURATION_ERROR);
    return NextResponse.json(
      { error: "We couldn't send your message right now. Please try again later." },
      { status: 500 },
    );
  }

  const subject = `[Ask Us Anything] ${category} — ${name}`;

  const text = [
    `New question from the Ask Us Anything form.`,
    ``,
    `Name:     ${name}`,
    `Email:    ${email}`,
    `Category: ${category}`,
    ``,
    `Message:`,
    message,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #0a0a0a; line-height: 1.6;">
      <p style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #ee4b1a; margin: 0 0 16px; font-weight: 600;">
        Ask Us Anything
      </p>
      <table style="border-collapse: collapse; margin: 0 0 20px;">
        <tr><td style="padding: 4px 16px 4px 0; color: rgba(0,0,0,0.55);">Name</td><td style="padding: 4px 0;"><strong>${escapeHtml(name)}</strong></td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: rgba(0,0,0,0.55);">Email</td><td style="padding: 4px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #0a0a0a;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: rgba(0,0,0,0.55);">Category</td><td style="padding: 4px 0;">${escapeHtml(category)}</td></tr>
      </table>
      <div style="border-top: 1px solid rgba(0,0,0,0.12); padding-top: 20px;">
        <p style="color: rgba(0,0,0,0.55); margin: 0 0 8px; font-size: 14px;">Message</p>
        <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(message)}</p>
      </div>
    </div>
  `;

  try {
    // Call the Resend REST API directly (no SDK dependency needed).
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: RECIPIENTS,
        reply_to: email,
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Resend API error (${res.status}) sending Ask Us Anything email:`, detail);
      return NextResponse.json(
        { error: "We couldn't send your message right now. Please try again later." },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("Unexpected error sending Ask Us Anything email:", err);
    return NextResponse.json(
      { error: "We couldn't send your message right now. Please try again later." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
