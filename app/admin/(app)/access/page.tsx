import { PageHeading } from "@/components/admin/shell";
import { Badge, formatDate, initials } from "@/components/admin/ui";
import { listAccessUsers } from "@/lib/admin/access";
import { approveAccessAction, declineAccessAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccessPage() {
  const { admins, pending } = await listAccessUsers();

  return (
    <>
      <PageHeading
        eyebrow="Workspace"
        title="Access"
        description="Approve people who requested administrator access. Only admins can use members, campaigns and outreach."
      />
      <section className="admin-table-panel" style={{ marginBottom: 16 }}>
        <div className="member-summary">
          <div>
            <strong>Pending requests</strong>
            <span>{pending.length} waiting</span>
          </div>
        </div>
        {pending.length === 0 ? (
          <p className="admin-empty-note">No access requests right now.</p>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Requested</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="member-cell">
                        <span>{initials(row.name)}</span>
                        <strong>{row.name}</strong>
                      </div>
                    </td>
                    <td>{row.email}</td>
                    <td>{formatDate(row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt))}</td>
                    <td>
                      <div className="admin-inline-form">
                        <form action={approveAccessAction}>
                          <input type="hidden" name="userId" value={row.id} />
                          <button className="admin-primary" type="submit">
                            Add as admin
                          </button>
                        </form>
                        <form action={declineAccessAction}>
                          <input type="hidden" name="userId" value={row.id} />
                          <button className="admin-secondary" type="submit">
                            Decline
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="admin-table-panel">
        <div className="member-summary">
          <div>
            <strong>Administrators</strong>
            <span>{admins.length} with workspace access</span>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="member-cell">
                      <span>{initials(row.name)}</span>
                      <strong>{row.name}</strong>
                    </div>
                  </td>
                  <td>{row.email}</td>
                  <td>
                    <Badge tone="success">Admin</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
