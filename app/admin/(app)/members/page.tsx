import Link from "next/link";
import { PageHeading } from "@/components/admin/shell";
import ImportMembersForm from "@/components/admin/import-members-form";
import { Badge, formatDate, Icon, initials } from "@/components/admin/ui";
import { listMembers } from "@/lib/admin/store";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; city?: string }>;
}) {
  const params = await searchParams;
  const { members, total, cities } = await listMembers({
    query: params.q,
    status: params.status,
    city: params.city,
  });

  return (
    <>
      <PageHeading
        eyebrow="Community"
        title="Members"
        description="Everyone who signed up through the Physical I/O Google Form, plus any members added here."
        action={
          <Link className="admin-primary" href="/admin/members/new">
            <Icon name="plus" size={16} />
            Add member
          </Link>
        }
      />
      <form className="admin-toolbar" method="get">
        <label>
          <Icon name="search" />
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search name, email, role or city" />
        </label>
        <select name="status" defaultValue={params.status ?? "all"} className="admin-select">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="review">Review</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
        <select name="city" defaultValue={params.city ?? "all"} className="admin-select">
          <option value="all">All cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <button type="submit">Filter</button>
        <div className="toolbar-spacer" />
        <ImportMembersForm />
      </form>
      <section className="admin-table-panel">
        <div className="member-summary">
          <strong>{members.length} shown</strong>
          <span>{total} total members</span>
          <div />
          <Link href="/admin/campaigns/new">Email this view</Link>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Location</th>
                <th>Experience</th>
                <th>Work areas</th>
                <th>Joined</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <Link className="member-cell" href={`/admin/members/${member.id}`}>
                        <span>{initials(member.fullName)}</span>
                        <p>
                          <strong>{member.fullName}</strong>
                          <small>{member.email}</small>
                        </p>
                      </Link>
                    </td>
                    <td>{member.professionalRole || "—"}</td>
                    <td>{member.city || "—"}</td>
                    <td>{member.experienceRange || "—"}</td>
                    <td>
                      <div className="topic-list">
                        {member.interests.slice(0, 2).map((topic) => (
                          <Badge key={topic}>{topic}</Badge>
                        ))}
                      </div>
                    </td>
                    <td>{formatDate(member.signedUpAt)}</td>
                    <td>
                      <Badge tone={member.status === "active" ? "success" : member.status === "review" ? "warning" : "neutral"}>
                        {member.status}
                      </Badge>
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
