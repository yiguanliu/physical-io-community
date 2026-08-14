"use client";

import { useState, useTransition } from "react";
import { previewAudienceAction, saveCampaignAction } from "@/app/admin/actions";
import type { AudienceFilter } from "@/lib/admin/audience";

export default function CampaignForm({
  campaign,
  events,
}: {
  campaign?: {
    id: string;
    name: string;
    type: string;
    subject: string;
    previewText: string;
    fromName: string;
    replyTo: string;
    body: string;
    eventId: string | null;
    audienceFilter: string;
    status: string;
  };
  events: Array<{ id: string; title: string }>;
}) {
  const locked = campaign ? !["draft", "failed"].includes(campaign.status) : false;
  const [pending, start] = useTransition();
  const [count, setCount] = useState<number | null>(null);
  const audience = campaign ? (JSON.parse(campaign.audienceFilter) as AudienceFilter) : { requireConsent: true };

  function currentFilter(form: HTMLFormElement): AudienceFilter {
    const data = new FormData(form);
    return {
      campaignType: String(data.get("type") || "newsletter") as AudienceFilter["campaignType"],
      memberIds: String(data.get("memberIds") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      requireConsent: data.get("requireConsent") === "on",
      statuses: String(data.get("statuses") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      cities: String(data.get("cities") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      roles: String(data.get("roles") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      interests: String(data.get("interests") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }

  return (
    <form className="admin-form" action={saveCampaignAction}>
      {campaign ? <input type="hidden" name="id" value={campaign.id} /> : null}
      <input type="hidden" name="memberIds" value={audience.memberIds?.join(",") ?? ""} />
      <label>
        Campaign name
        <input name="name" required defaultValue={campaign?.name} disabled={locked} />
      </label>
      <label>
        Type
        <select name="type" defaultValue={campaign?.type ?? "newsletter"} disabled={locked}>
          <option value="newsletter">Newsletter</option>
          <option value="event_update">Event update</option>
          <option value="announcement">Announcement</option>
        </select>
      </label>
      <label>
        Subject
        <input name="subject" required defaultValue={campaign?.subject} disabled={locked} />
      </label>
      <label>
        Preview text
        <input name="previewText" defaultValue={campaign?.previewText} disabled={locked} />
      </label>
      <label>
        From name
        <input name="fromName" defaultValue={campaign?.fromName ?? "Physical I/O"} disabled={locked} />
      </label>
      <label>
        Reply-to
        <input name="replyTo" type="email" defaultValue={campaign?.replyTo} disabled={locked} />
      </label>
      <label>
        Linked event
        <select name="eventId" defaultValue={campaign?.eventId ?? ""} disabled={locked}>
          <option value="">None</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cities
        <input name="cities" defaultValue={audience.cities?.join(", ") ?? ""} placeholder="London" disabled={locked} />
      </label>
      <label>
        Roles
        <input name="roles" defaultValue={audience.roles?.join(", ") ?? ""} placeholder="Engineer, Designer" disabled={locked} />
      </label>
      <label>
        Interests
        <input name="interests" defaultValue={audience.interests?.join(", ") ?? ""} disabled={locked} />
      </label>
      <label>
        Statuses
        <input name="statuses" defaultValue={audience.statuses?.join(", ") ?? "active"} disabled={locked} />
      </label>
      {audience.memberIds?.length ? (
        <p className="admin-selected-audience">
          Selected audience: <strong>{audience.memberIds.length}</strong> member{audience.memberIds.length === 1 ? "" : "s"}
        </p>
      ) : null}
      <label className="admin-check">
        <input type="checkbox" name="requireConsent" value="on" defaultChecked={audience.requireConsent !== false} disabled={locked} />
        Only send to members subscribed to this topic
      </label>
      <label className="admin-form-wide">
        Body
        <textarea name="body" rows={12} required defaultValue={campaign?.body ?? "Hi {{first_name}},\n\n"} disabled={locked} />
        <small>Personalise with {"{{first_name}}"}, {"{{full_name}}"}, {"{{city}}"}.</small>
      </label>
      <div className="admin-form-actions">
        <button
          className="admin-secondary"
          type="button"
          disabled={pending}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (!form) return;
            start(async () => {
              const preview = await previewAudienceAction(currentFilter(form));
              setCount(preview.eligibleCount);
            });
          }}
        >
          {pending ? "Counting…" : count === null ? "Count recipients" : `${count} eligible`}
        </button>
        {locked ? null : (
          <button className="admin-primary" type="submit">
            Save draft
          </button>
        )}
      </div>
    </form>
  );
}
