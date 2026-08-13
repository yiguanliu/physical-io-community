import { notFound } from "next/navigation";
import CampaignForm from "@/components/admin/campaign-form";
import CampaignSend from "@/components/admin/campaign-send";
import { PageHeading } from "@/components/admin/shell";
import { Badge } from "@/components/admin/ui";
import { getCampaign, listEvents } from "@/lib/admin/store";
import { requireAdmin } from "@/lib/auth/session";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const events = await listEvents();
  const sent = campaign.recipients.filter((row) => ["sent", "delivered", "opened", "clicked"].includes(row.status)).length;
  const opened = campaign.recipients.filter((row) => ["opened", "clicked"].includes(row.status)).length;
  const bounced = campaign.recipients.filter((row) => row.status === "bounced" || row.status === "complained").length;

  return (
    <>
      <PageHeading
        eyebrow={campaign.type}
        title={campaign.name}
        description={campaign.subject}
        action={<Badge tone={campaign.status === "sent" ? "success" : "neutral"}>{campaign.status}</Badge>}
      />
      <div className="admin-metrics compact-metrics">
        <article className="admin-metric">
          <span>Recipients</span>
          <strong>{campaign.recipientCount}</strong>
          <small>{campaign.skipCount} skipped</small>
        </article>
        <article className="admin-metric">
          <span>Delivered</span>
          <strong>{sent}</strong>
          <small>Tracked sends</small>
        </article>
        <article className="admin-metric">
          <span>Opened</span>
          <strong>{opened}</strong>
          <small>{sent ? `${Math.round((opened / sent) * 100)}%` : "—"}</small>
        </article>
        <article className="admin-metric">
          <span>Bounced / complained</span>
          <strong>{bounced}</strong>
          <small>Auto-suppressed</small>
        </article>
      </div>
      <CampaignSend id={campaign.id} status={campaign.status} email={admin.email} />
      <CampaignForm
        campaign={{
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          subject: campaign.subject,
          previewText: campaign.previewText,
          fromName: campaign.fromName,
          replyTo: campaign.replyTo,
          body: campaign.body,
          eventId: campaign.eventId,
          audienceFilter: campaign.audienceFilter,
          status: campaign.status,
        }}
        events={events.map((event) => ({ id: event.id, title: event.title }))}
      />
      {campaign.recipients.length ? (
        <section className="admin-table-panel" style={{ marginTop: 16 }}>
          <div className="member-summary">
            <strong>Delivery log</strong>
            <span>{campaign.recipients.length} rows</span>
          </div>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {campaign.recipients.slice(0, 200).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <div>{row.email}</div>
                    </td>
                    <td>{row.status}</td>
                    <td>{row.skipReason || "—"}</td>
                    <td>{row.sentAt ? new Date(row.sentAt).toLocaleString("en-GB") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
