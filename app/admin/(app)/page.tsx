import Link from "next/link";
import { PageHeading } from "@/components/admin/shell";
import { Badge, Icon, initials } from "@/components/admin/ui";
import { overviewStats } from "@/lib/admin/store";

export default async function AdminOverviewPage() {
  const stats = await overviewStats();
  const greeting = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const stages = [
    ["NEW_RESEARCH", "Research"],
    ["DRAFTED", "Drafted"],
    ["SENT", "Sent"],
    ["FOLLOW_UP", "Follow-up"],
    ["REPLIED", "Replied"],
    ["MEETING_BOOKED", "Meeting"],
  ] as const;
  const maxPipeline = Math.max(1, ...stages.map(([key]) => stats.pipeline[key] ?? 0));

  return (
    <>
      <PageHeading
        eyebrow={greeting}
        title="Workspace overview"
        description="Members, campaigns and sponsor outreach in one place."
        action={
          <Link className="admin-secondary" href="/admin/campaigns/new">
            Create campaign
          </Link>
        }
      />
      {stats.databaseError || stats.ephemeral || !stats.resendHealth?.ok ? (
        <div className="admin-stage-banner">
          <div className="stage-index">01</div>
          <div>
            <span>SETUP</span>
            <h2>
              {stats.databaseError
                ? "Supabase database unavailable"
                : stats.ephemeral
                  ? "Supabase admin key missing"
                  : "Check email sending"}
            </h2>
            <p>
              {stats.databaseError
                ? "The admin database could not be read. Apply the Supabase migration, verify service-role table grants, then redeploy. "
                : ""}
              {stats.ephemeral
                ? "Admin roles and workspace data are stored in Supabase. Set SUPABASE_SECRET_KEY, then redeploy. "
                : ""}
              {stats.resendHealth?.message ??
                "Email sending is disabled until RESEND_API_KEY and a verified RESEND_FROM sender are configured."}
            </p>
          </div>
          <Link href="/admin/campaigns">Open campaigns</Link>
        </div>
      ) : null}
      <div className="admin-metrics">
        <article className="admin-metric">
          <span>Active members</span>
          <strong>{stats.memberCount}</strong>
          <small className="up">+{stats.monthCount} this month</small>
        </article>
        <article className="admin-metric">
          <span>Sponsor CRM leads</span>
          <strong>{stats.leadCount}</strong>
          <small>Active outreach records</small>
        </article>
        <article className="admin-metric">
          <span>Newsletter subscribers</span>
          <strong>{stats.subscribed}</strong>
          <small>{stats.memberCount ? Math.round((stats.subscribed / stats.memberCount) * 1000) / 10 : 0}% of members</small>
        </article>
        <article className="admin-metric">
          <span>Email delivery</span>
          <strong>{Math.round(stats.deliveryRate * 1000) / 10}%</strong>
          <small className="up">{Math.round(stats.openRate * 1000) / 10}% opened</small>
        </article>
      </div>
      <div className="admin-grid-two">
        <section className="admin-panel">
          <header className="panel-head">
            <div>
              <h3>Sponsor pipeline</h3>
              <span>{stats.leadCount} active records</span>
            </div>
            <Link href="/admin/outreach">
              View outreach
              <Icon name="arrow" size={14} />
            </Link>
          </header>
          <div className="pipeline-bars">
            {stages.map(([key, label]) => (
              <div key={key}>
                <span>
                  {label}
                  <b>{stats.pipeline[key] ?? 0}</b>
                </span>
                <i>
                  <em style={{ width: `${Math.round(((stats.pipeline[key] ?? 0) / maxPipeline) * 100)}%` }} />
                </i>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <header className="panel-head">
            <div>
              <h3>Recent campaigns</h3>
              <span>{stats.recentCampaigns.length} latest</span>
            </div>
            <Link href="/admin/campaigns">
              View all
              <Icon name="arrow" size={14} />
            </Link>
          </header>
          <div className="attention-list">
            {stats.recentCampaigns.map((campaign) => (
              <Link key={campaign.id} href={`/admin/campaigns/${campaign.id}`}>
                <span className="attention-icon">
                  <Icon name="mail" />
                </span>
                <p>
                  <strong>{campaign.name}</strong>
                  <small>
                    {campaign.type} · {campaign.status}
                    {campaign.recipientCount ? ` · ${campaign.recipientCount} sent` : ""}
                  </small>
                </p>
                <Icon name="arrow" size={16} />
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className="admin-panel admin-activity-panel">
        <header className="panel-head">
          <div>
            <h3>Recent activity</h3>
            <span>Audit log</span>
          </div>
        </header>
        <div className="activity-table">
          {stats.recentAudit.map((item) => (
            <div key={item.id}>
              <span className="avatar ink">
                {initials(String(item.actorName)) || "PI"}
              </span>
              <p>
                <strong>{item.summary}</strong>
                <small>
                  {item.actorName} · {item.action}
                </small>
              </p>
              <Badge>{item.entityType}</Badge>
              <time>{new Date(item.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
