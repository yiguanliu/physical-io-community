"use client";

import { useState, useTransition } from "react";
import { sendCampaignAction, sendTestCampaignAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CampaignSend({ id, status, email }: { id: string; status: string; email: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const canSend = ["draft", "failed"].includes(status);

  return (
    <div className="admin-send-box">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          start(async () => {
            await sendTestCampaignAction(form);
            setMessage("Test email queued.");
          });
        }}
      >
        <input type="hidden" name="id" value={id} />
        <label>
          Test send to
          <Input name="testEmail" type="email" defaultValue={email} required />
        </label>
        <Button className="admin-secondary" variant="outline" type="submit" disabled={pending}>
          Send test
        </Button>
      </form>
      {canSend ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!confirm("Send this campaign to the resolved audience? This cannot be undone.")) return;
            const form = new FormData(event.currentTarget);
            start(async () => {
              const result = await sendCampaignAction(form);
              setMessage(`Sent ${result.sent}. Skipped ${result.skipped}. Failed ${result.failed}.`);
            });
          }}
        >
          <input type="hidden" name="id" value={id} />
          <Button className="admin-primary" type="submit" disabled={pending}>
            Send to audience
          </Button>
        </form>
      ) : (
        <p>This campaign is {status} and cannot be sent again.</p>
      )}
      {message ? <p>{message}</p> : null}
    </div>
  );
}
