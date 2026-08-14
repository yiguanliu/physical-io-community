import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { recordProviderEvent } from "@/lib/admin/campaigns";
import { readyDb } from "@/lib/db/client";

export async function POST(request: Request) {
  await readyDb();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const payload = await request.text();
  if (secret) {
    try {
      const webhook = new Webhook(secret);
      webhook.verify(payload, {
        "svix-id": request.headers.get("svix-id") ?? "",
        "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
        "svix-signature": request.headers.get("svix-signature") ?? "",
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production" && process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Webhook secret required" }, { status: 401 });
  }

  const body = JSON.parse(payload || "{}") as {
    type?: string;
    data?: { email_id?: string; to?: string[] };
  };
  const type = (body.type ?? "").replace("email.", "");
  await recordProviderEvent({
    providerEventId: request.headers.get("svix-id") || `resend_${body.data?.email_id}_${type}`,
    type,
    providerId: body.data?.email_id,
    email: body.data?.to?.[0],
    payload: body,
  });
  return NextResponse.json({ ok: true });
}
