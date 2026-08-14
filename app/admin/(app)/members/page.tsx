import Link from "next/link";
import { PageHeading } from "@/components/admin/shell";
import ImportMembersForm from "@/components/admin/import-members-form";
import MemberSelectionTable from "@/components/admin/member-selection-table";
import { Icon } from "@/components/admin/ui";
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
      <MemberSelectionTable members={members} total={total} />
    </>
  );
}
