"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scheduleContentAction } from "@/app/admin/content-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function localInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function ScheduleForm({ id, scheduledAt }: { id: string; scheduledAt: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(() => localInputValue(scheduledAt));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    const form = new FormData();
    form.set("id", id);
    form.set("scheduledAt", value ? new Date(value).toISOString() : "");
    setMessage(value ? "Scheduling…" : "Clearing…");
    startTransition(async () => {
      try {
        await scheduleContentAction(form);
        setMessage(value ? "Schedule saved." : "Schedule cleared.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save the schedule.");
      }
    });
  }

  return (
    <div className="content-schedule-form">
      <label htmlFor="content-scheduled-at">Publish date and time</label>
      <Input
        id="content-scheduled-at"
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="content-schedule-actions">
        <Button type="button" className="admin-secondary" variant="outline" onClick={save} disabled={pending || !value}>
          {pending ? "Saving…" : "Save schedule"}
        </Button>
        {scheduledAt || value ? (
          <Button
            type="button"
            className="admin-link-button h-auto p-0"
            variant="link"
            disabled={pending}
            onClick={() => {
              setValue("");
              const form = new FormData();
              form.set("id", id);
              form.set("scheduledAt", "");
              setMessage("Clearing…");
              startTransition(async () => {
                try {
                  await scheduleContentAction(form);
                  setMessage("Schedule cleared.");
                  router.refresh();
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Could not clear the schedule.");
                }
              });
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <p className="content-help" aria-live="polite">
        {message ?? (scheduledAt ? `Scheduled for ${new Date(scheduledAt).toLocaleString("en-GB")}` : "Adds this item to the calendar.")}
      </p>
    </div>
  );
}
