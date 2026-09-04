import { PageHeading } from "@/components/admin/shell";
import { createMemberAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/admin/form-select";

export default function NewMemberPage() {
  return (
    <>
      <PageHeading eyebrow="Community" title="Add member" description="Create a member record. Marketing consent stays off unless you explicitly opt them in." />
      <form className="admin-form" action={createMemberAction}>
        <label>
          Full name
          <Input name="fullName" required />
        </label>
        <label>
          Email
          <Input name="email" type="email" required />
        </label>
        <label>
          City
          <Input name="city" />
        </label>
        <label>
          Professional role
          <Input name="professionalRole" />
        </label>
        <label>
          Experience
          <Input name="experienceRange" />
        </label>
        <label>
          Website / GitHub
          <Input name="websiteUrl" />
        </label>
        <label>
          LinkedIn
          <Input name="linkedinUrl" />
        </label>
        <label>
          Status
          <FormSelect
            name="status"
            defaultValue="active"
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
          <Input name="interests" placeholder="Robotics, AI/ML Training" />
        </label>
        <label className="admin-form-wide">
          Community goals
          <Input name="communityGoals" placeholder="Meeting collaborators / co-founders" />
        </label>
        <label className="admin-form-wide">
          Preferred formats
          <Input name="eventFormats" placeholder="Talks / panels, Hands-on workshops" />
        </label>
        <label className="admin-form-wide">
          Community suggestions
          <Textarea name="suggestions" rows={3} />
        </label>
        <label className="admin-form-wide">
          Notes
          <Textarea name="notes" rows={4} />
        </label>
        <label className="admin-check">
          <Checkbox name="newsletterConsent" />
          Opt in to newsletter (only if they have given explicit consent)
        </label>
        <Button className="admin-primary" type="submit">
          Save member
        </Button>
      </form>
    </>
  );
}
