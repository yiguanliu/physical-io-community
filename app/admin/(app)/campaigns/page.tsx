import Link from "next/link";
import { PageHeading } from "@/components/admin/shell";
import { Badge, Icon } from "@/components/admin/ui";
import { listCampaigns } from "@/lib/admin/store";

function toneFor(status: string) {
  if (status === "sent") return "success";
  if (status === "scheduled" || status === "sending") return "info";
  if (status === "failed") return "warning";
  return "neutral";
}

export default async function CampaignsPage() {
  const rows = await listCampaigns();
  return (
    <>
      <PageHeading
        eyebrow="Messaging"
        title="Communications"
        description="Create newsletters, event updates and member announcements. Audiences honour consent and suppression."
        action={
          <Link className="admin-primary" href="/admin/campaigns/new">
            <Icon name="plus" size={16} />
            Create campaign
          </Link>
        }
      />
      <section className="admin-table-panel">
        <div className="member-summary">
          <strong>Campaigns</strong>
          <span>Draft, sending and sent</span>
        </div>
        <div className="campaign-list">
          {rows.map((campaign) => (
            <Link key={campaign.id} href={`/admin/campaigns/${campaign.id}`}>
              <span className="campaign-icon">
                <Icon name={campaign.type === "event_update" ? "calendar" : "mail"} />
              </span>
              <p>
                <strong>{campaign.name}</strong>
                <small>
                  {campaign.type} · {campaign.recipientCount ? `${campaign.recipientCount} sent` : "Not sent"}
                </small>
              </p>
              <Badge tone={toneFor(campaign.status)}>{campaign.status}</Badge>
              <span>{campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString("en-GB") : "Draft"}</span>
              <b>{campaign.subject ? "" : ""}</b>
              <Icon name="arrow" size={16} />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
