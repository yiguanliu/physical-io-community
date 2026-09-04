import { notFound } from "next/navigation";
import { updateMemberAction } from "@/app/admin/actions";
import { PageHeading } from "@/components/admin/shell";
import { Badge } from "@/components/admin/ui";
import { getMember } from "@/lib/admin/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/admin/form-select";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMember(id);
  if (!member) notFound();

  return (
    <>
      <PageHeading
        eyebrow="Member"
        title={member.fullName}
        description={`${member.email} · joined ${new Date(member.signedUpAt).toLocaleDateString("en-GB")} · ${member.source.replaceAll("_", " ")}`}
        action={<Badge tone={member.status === "active" ? "success" : "neutral"}>{member.status}</Badge>}
      />
      <form className="admin-form" action={updateMemberAction}>
        <input type="hidden" name="id" value={member.id} />
        <label>
          Full name
          <Input name="fullName" defaultValue={member.fullName} required />
        </label>
        <label>
          Email
          <Input name="email" type="email" defaultValue={member.email} required />
        </label>
        <label>
          City
          <Input name="city" defaultValue={member.city} />
        </label>
        <label>
          Professional role
          <Input name="professionalRole" defaultValue={member.professionalRole} />
        </label>
        <label>
          Experience
          <Input name="experienceRange" defaultValue={member.experienceRange} />
        </label>
        <label>
          Website / GitHub
          <Input name="websiteUrl" defaultValue={member.websiteUrl} />
        </label>
        <label>
          LinkedIn
          <Input name="linkedinUrl" defaultValue={member.linkedinUrl} />
        </label>
        <label>
          Status
          <FormSelect
            name="status"
            defaultValue={member.status}
            options={[
              { value: "active", label: "Active" },
              { value: "review", label: "Review" },
              { value: "paused", label: "Paused" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </label>
        <label className="admin-form-wide">
          Work areas
          <Input name="interests" defaultValue={member.interests.join(", ")} />
        </label>
        <label className="admin-form-wide">
          Community goals
          <Input name="communityGoals" defaultValue={member.communityGoals.join(", ")} />
        </label>
        <label className="admin-form-wide">
          Preferred formats
          <Input name="eventFormats" defaultValue={member.eventFormats.join(", ")} />
        </label>
        <label className="admin-form-wide">
          Community suggestions
          <Textarea name="suggestions" rows={3} defaultValue={member.suggestions} />
        </label>
        <label className="admin-form-wide">
          Notes
          <Textarea name="notes" rows={4} defaultValue={member.notes} />
        </label>
        {member.subscriptions.map((subscription) => (
          <label key={subscription.id}>
            {subscription.topic}
            <FormSelect
              name={`sub_${subscription.topic}`}
              defaultValue={subscription.status}
              options={[
                { value: "subscribed", label: "Subscribed" },
                { value: "consent_unknown", label: "Consent unknown" },
                { value: "unsubscribed", label: "Unsubscribed" },
              ]}
            />
          </label>
        ))}
        <Button className="admin-primary" type="submit">
          Save changes
        </Button>
      </form>
    </>
  );
}
