import { notFound } from "next/navigation";
import { updateMemberAction } from "@/app/admin/actions";
import { PageHeading } from "@/components/admin/shell";
import { Badge } from "@/components/admin/ui";
import { getMember } from "@/lib/admin/store";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMember(id);
  if (!member) notFound();

  return (
    <>
      <PageHeading
        eyebrow="Member"
        title={member.fullName}
        description={`${member.email} · joined ${new Date(member.signedUpAt).toLocaleDateString("en-GB")}`}
        action={<Badge tone={member.status === "active" ? "success" : "neutral"}>{member.status}</Badge>}
      />
      <form className="admin-form" action={updateMemberAction}>
        <input type="hidden" name="id" value={member.id} />
        <label>
          Full name
          <input name="fullName" defaultValue={member.fullName} required />
        </label>
        <label>
          Email
          <input name="email" type="email" defaultValue={member.email} required />
        </label>
        <label>
          City
          <input name="city" defaultValue={member.city} />
        </label>
        <label>
          Professional role
          <input name="professionalRole" defaultValue={member.professionalRole} />
        </label>
        <label>
          Experience
          <input name="experienceRange" defaultValue={member.experienceRange} />
        </label>
        <label>
          Website / GitHub
          <input name="websiteUrl" defaultValue={member.websiteUrl} />
        </label>
        <label>
          LinkedIn
          <input name="linkedinUrl" defaultValue={member.linkedinUrl} />
        </label>
        <label>
          Status
          <select name="status" defaultValue={member.status}>
            <option value="active">Active</option>
            <option value="review">Review</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="admin-form-wide">
          Interests
          <input name="interests" defaultValue={member.interests.join(", ")} />
        </label>
        <label className="admin-form-wide">
          Notes
          <textarea name="notes" rows={4} defaultValue={member.notes} />
        </label>
        {member.subscriptions.map((subscription) => (
          <label key={subscription.id}>
            {subscription.topic}
            <select name={`sub_${subscription.topic}`} defaultValue={subscription.status}>
              <option value="subscribed">Subscribed</option>
              <option value="consent_unknown">Consent unknown</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </label>
        ))}
        <button className="admin-primary" type="submit">
          Save changes
        </button>
      </form>
    </>
  );
}
