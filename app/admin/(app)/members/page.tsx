import Link from "next/link";
import { PageHeading } from "@/components/admin/shell";
import ImportMembersForm from "@/components/admin/import-members-form";
import MemberSelectionTable from "@/components/admin/member-selection-table";
import { Icon } from "@/components/admin/ui";
import { listMembers } from "@/lib/admin/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/admin/form-select";

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
          <Button asChild className="admin-primary">
            <Link href="/admin/members/new">
              <Icon name="plus" size={16} />
              Add member
            </Link>
          </Button>
        }
      />
      <form className="admin-toolbar" method="get">
        <label>
          <Icon name="search" />
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search name, email, role or city" />
        </label>
        <FormSelect
          name="status"
          defaultValue={params.status ?? "all"}
          className="admin-select"
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "review", label: "Review" },
            { value: "paused", label: "Paused" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <FormSelect
          name="city"
          defaultValue={params.city ?? "all"}
          className="admin-select"
          options={[{ value: "all", label: "All cities" }, ...cities.map((city) => ({ value: city, label: city }))]}
        />
        <Button type="submit" variant="outline">Filter</Button>
        <div className="toolbar-spacer" />
        <ImportMembersForm />
      </form>
      <MemberSelectionTable members={members} total={total} />
    </>
  );
}
