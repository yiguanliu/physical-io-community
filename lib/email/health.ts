import { getFromAddress, isResendConfigured } from "@/lib/email/send";

export type ResendHealth = {
  configured: boolean;
  ok: boolean;
  message: string;
  fromAddress: string;
  fromDomain: string | null;
};

type DomainRow = {
  name?: string;
  status?: string;
};

function senderEmail(value: string) {
  return value.match(/<([^<>@\s]+@[^<>@\s]+)>/)?.[1] ?? value.match(/[^\s<>@]+@[^\s<>@]+/)?.[0] ?? "";
}

export function senderDomain(value: string) {
  const email = senderEmail(value);
  return email.includes("@") ? email.split("@").pop()?.toLowerCase() ?? null : null;
}

function explainResendStatus(status: number) {
  if (status === 401) return "Resend rejected RESEND_API_KEY. Check that the key is current and copied without whitespace.";
  if (status === 403) return "Resend accepted the key, but it cannot list domains. Use a full-access key for diagnostics or send a test email.";
  return `Resend diagnostics failed with HTTP ${status}.`;
}

export async function checkResendHealth(): Promise<ResendHealth> {
  const fromAddress = getFromAddress();
  const fromDomain = senderDomain(fromAddress);
  if (!isResendConfigured()) {
    return {
      configured: false,
      ok: false,
      message: "RESEND_API_KEY is not configured.",
      fromAddress,
      fromDomain,
    };
  }

  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        configured: true,
        ok: false,
        message: explainResendStatus(response.status),
        fromAddress,
        fromDomain,
      };
    }

    const body = (await response.json()) as { data?: DomainRow[] };
    const domains = Array.isArray(body.data) ? body.data : [];
    const sender = domains.find((domain) => domain.name?.toLowerCase() === fromDomain);
    if (!fromDomain) {
      return {
        configured: true,
        ok: false,
        message: "RESEND_FROM does not contain a valid sender email address.",
        fromAddress,
        fromDomain,
      };
    }
    if (!sender) {
      return {
        configured: true,
        ok: false,
        message: `${fromDomain} is not listed in this Resend account.`,
        fromAddress,
        fromDomain,
      };
    }
    if (sender.status !== "verified") {
      return {
        configured: true,
        ok: false,
        message: `${fromDomain} is ${sender.status ?? "not verified"} in Resend.`,
        fromAddress,
        fromDomain,
      };
    }
    return {
      configured: true,
      ok: true,
      message: `${fromDomain} is verified in Resend.`,
      fromAddress,
      fromDomain,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      message: error instanceof Error ? error.message : "Could not reach Resend diagnostics.",
      fromAddress,
      fromDomain,
    };
  }
}
