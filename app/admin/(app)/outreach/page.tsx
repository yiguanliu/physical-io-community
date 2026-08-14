import { createLeadAction } from "@/app/admin/actions";
import OutreachBoard from "@/components/admin/outreach-board";
import { PageHeading } from "@/components/admin/shell";
import { Icon } from "@/components/admin/ui";
import { getLead, listOutreach } from "@/lib/admin/store";

export default async function OutreachPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const params = await searchParams;
  const leads = await listOutreach();
  const selectedId = params.lead || leads[0]?.id;
  const selected = selectedId ? await getLead(selectedId) : null;

  return (
    <>
      <PageHeading
        eyebrow="Sponsor operations"
        title="Outreach"
        description="Track organisations from research through conversation. Sends are logged against the lead."
        action={
          <details className="admin-details">
            <summary className="admin-primary">
              <Icon name="plus" size={16} />
              New lead
            </summary>
            <form className="admin-form compact-form" action={createLeadAction}>
              <label>
                Organisation
                <input name="company" required />
              </label>
              <label>
                Website
                <input name="website" />
              </label>
              <label>
                Contact name
                <input name="contactName" required />
              </label>
              <label>
                Contact email
                <input name="contactEmail" type="email" required />
              </label>
              <label>
                Role
                <input name="contactRole" />
              </label>
              <label>
                Estimated value (£)
                <input name="estimatedValueGbp" type="number" defaultValue="0" />
              </label>
              <button className="admin-primary" type="submit">
                Create lead
              </button>
            </form>
          </details>
        }
      />
      <OutreachBoard
        leads={leads}
        selected={
          selected
            ? {
                id: selected.id,
                company: selected.company,
                contactName: selected.contactName,
                contactEmail: selected.contactEmail,
                contactRole: selected.contactRole,
                status: selected.status,
                fitScore: selected.fitScore,
                estimatedValueGbp: selected.estimatedValueGbp,
                nextAction: selected.nextAction,
                lastActivityAt: selected.lastActivityAt,
                website: selected.website,
                activities: selected.activities,
                messages: selected.messages,
              }
            : null
        }
      />
    </>
  );
}
