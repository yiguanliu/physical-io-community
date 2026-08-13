import { PageHeading } from "@/components/admin/shell";
import { createMemberAction } from "@/app/admin/actions";

export default function NewMemberPage() {
  return (
    <>
      <PageHeading eyebrow="Community" title="Add member" description="Create a member record. Marketing consent stays off unless you explicitly opt them in." />
      <form className="admin-form" action={createMemberAction}>
        <label>
          Full name
          <input name="fullName" required />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          City
          <input name="city" />
        </label>
        <label>
          Professional role
          <input name="professionalRole" />
        </label>
        <label>
          Experience
          <input name="experienceRange" />
        </label>
        <label>
          Website / GitHub
          <input name="websiteUrl" />
        </label>
        <label>
          LinkedIn
          <input name="linkedinUrl" />
        </label>
        <label>
          Status
          <select name="status" defaultValue="active">
            <option value="active">Active</option>
            <option value="review">Review</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="admin-form-wide">
          Work areas
          <input name="interests" placeholder="Robotics, AI/ML Training" />
        </label>
        <label className="admin-form-wide">
          Community goals
          <input name="communityGoals" placeholder="Meeting collaborators / co-founders" />
        </label>
        <label className="admin-form-wide">
          Preferred formats
          <input name="eventFormats" placeholder="Talks / panels, Hands-on workshops" />
        </label>
        <label className="admin-form-wide">
          Community suggestions
          <textarea name="suggestions" rows={3} />
        </label>
        <label className="admin-form-wide">
          Notes
          <textarea name="notes" rows={4} />
        </label>
        <label className="admin-check">
          <input type="checkbox" name="newsletterConsent" />
          Opt in to newsletter (only if they have given explicit consent)
        </label>
        <button className="admin-primary" type="submit">
          Save member
        </button>
      </form>
    </>
  );
}
