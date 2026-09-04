import { saveEventAction } from "@/app/admin/actions";
import { PageHeading } from "@/components/admin/shell";
import { Badge, Icon } from "@/components/admin/ui";
import { listEvents } from "@/lib/admin/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/admin/form-select";

export default async function EventsPage() {
  const events = await listEvents();
  const featured = events.find((event) => event.status === "published") ?? events[0];
  return (
    <>
      <PageHeading eyebrow="Programme" title="Events" description="Keep event records here, then send announcements from Communications." />
      {featured ? (
        <div className="event-feature">
          <div>
            <Badge tone="info">{featured.status.toUpperCase()}</Badge>
            <span>{new Date(featured.startsAt).toLocaleString("en-GB")}</span>
            <h2>{featured.title}</h2>
            <p>{featured.description}</p>
            <div>
              <strong>{featured.registeredCount}</strong>
              <small>registered</small>
              <strong>{featured.venue || "TBC"}</strong>
              <small>venue</small>
            </div>
          </div>
          <div className="event-date">
            <span>
              {new Date(featured.startsAt).toLocaleString("en-GB", { month: "short" }).toUpperCase()}
            </span>
            <strong>{new Date(featured.startsAt).getDate()}</strong>
            <small>
              {new Date(featured.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </small>
          </div>
        </div>
      ) : null}
      <section className="admin-panel">
        <header className="panel-head">
          <div>
            <h3>Create event</h3>
          </div>
        </header>
        <form className="admin-form" action={saveEventAction}>
          <label>
            Title
            <Input name="title" required />
          </label>
          <label>
            Starts at
            <Input name="startsAt" type="datetime-local" required />
          </label>
          <label>
            Venue
            <Input name="venue" />
          </label>
          <label>
            Status
            <FormSelect
              name="status"
              defaultValue="draft"
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
                { value: "completed", label: "Completed" },
              ]}
            />
          </label>
          <label className="admin-form-wide">
            Description
            <Textarea name="description" rows={3} />
          </label>
          <label>
            Registration URL
            <Input name="registrationUrl" />
          </label>
          <label>
            Registered count
            <Input name="registeredCount" type="number" defaultValue="0" />
          </label>
          <Button className="admin-primary" type="submit">
            <Icon name="plus" size={16} />
            Save event
          </Button>
        </form>
      </section>
    </>
  );
}
