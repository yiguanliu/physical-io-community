"use client";

import { useState, useTransition } from "react";
import { sendCampaignAction, sendTestCampaignAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Email send failed.";
}

export default function CampaignSend({ id, status, email }: { id: string; status: string; email: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const canSend = ["draft", "failed"].includes(status);

  return (
    <div className="admin-send-box">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          start(async () => {
            setMessage(null);
            setIsError(false);
            try {
              await sendTestCampaignAction(form);
              setMessage("Test email sent.");
            } catch (error) {
              setIsError(true);
              setMessage(errorMessage(error));
            }
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
              setMessage(null);
              setIsError(false);
              try {
                const result = await sendCampaignAction(form);
                setMessage(`Sent ${result.sent}. Skipped ${result.skipped}. Failed ${result.failed}.`);
              } catch (error) {
                setIsError(true);
                setMessage(errorMessage(error));
              }
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
      {message ? (
        <p className={isError ? "admin-send-message error" : "admin-send-message"} role={isError ? "alert" : "status"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
