import type { ContentEvent } from "@/lib/admin/content-studio";

function label(event: ContentEvent) {
  if (event.type === "stage_change") {
    // Some stage events (e.g. confirming the master draft) carry only a detail.
    const stages = `${event.fromStatus ? `${event.fromStatus} → ` : ""}${event.toStatus ?? ""}`.trim();
    return stages || event.detail || event.type;
  }
  return event.detail || event.type;
}

export default function ContentTimeline({ events }: { events: ContentEvent[] }) {
  if (!events.length) return <p className="admin-empty-note">No activity yet.</p>;
  return (
    <ol className="content-timeline">
      {events.map((event) => (
        <li key={event.id}>
          <span className={`content-timeline-dot type-${event.type}`} aria-hidden="true" />
          <div>
            <strong>{label(event)}</strong>
            <small>
              {event.actorName || "System"} · {new Date(event.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
