// Notify all administrators when content is approved and ready to post.
import { ADMIN_ROLE, adminAllowlist } from "@/lib/auth/allowlist";
import { listAdminProfiles } from "@/lib/auth/profiles";
import { sendEmail } from "@/lib/email/send";
import { SITE_URL } from "@/lib/site";

async function adminEmails(): Promise<string[]> {
  const emails = new Set<string>(adminAllowlist());
  try {
    const profiles = await listAdminProfiles();
    for (const profile of profiles) {
      if (profile.role === ADMIN_ROLE && profile.email) emails.add(profile.email.toLowerCase());
    }
  } catch {
    // Fall back to the allowlist if profiles can't be read.
  }
  return [...emails];
}

export async function notifyAdminsContentReady(input: {
  itemId: string;
  title: string;
  approvedBy: string;
  platforms?: string[];
}) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || SITE_URL).replace(/\/$/, "");
  const link = `${base}/admin/marketing/${input.itemId}`;
  const recipients = await adminEmails();
  const platforms = input.platforms?.length ? input.platforms.join(", ") : "";
  const body = [
    `${input.approvedBy} approved "${input.title}" — it's ready to post.`,
    ...(platforms ? ["", `Ready for: ${platforms}.`] : []),
    "",
    "Open the item to download the assets and publish across platforms:",
    link,
    "",
    "— Physical I/O Marketing Studio",
  ].join("\n");

  const results = await Promise.allSettled(
    recipients.map((to) =>
      sendEmail({
        to,
        subject: `Ready to post: ${input.title}`,
        text: body,
        fromName: "Physical I/O",
      }),
    ),
  );
  const notified = results.filter((r) => r.status === "fulfilled").length;
  return { notified, total: recipients.length };
}
