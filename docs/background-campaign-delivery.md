# Background campaign delivery

Sending snapshots the audience and records `campaign.queued` in one transaction. The request returns before any member email is sent. A Next.js post-response worker begins immediately; Supabase Cron resumes unfinished work without an open browser. Campaign and recipient status remain in the existing database tables.

## Production setup (Vercel Hobby)

1. Deploy the new `/api/email/worker` route with the application's existing `CRON_SECRET` configured in Vercel. Do not publish this secret.
2. Store that same value in Supabase Vault under `physical_io_campaign_worker_secret`.
3. Run `scripts/configure-campaign-worker.sql` in the production Supabase SQL editor. It schedules a once-per-minute check and calls the worker only when an explicitly queued campaign is still sending. No Vercel Pro cron is needed.
4. Confirm the cron job is active and its HTTP calls receive 200. A 401 means the Vault and Vercel secrets differ. This setup is required before claiming sending reliably survives function interruption.

The scheduler does not enqueue drafts or resend completed/failed campaigns. Session advisory locks serialize workers and individual campaigns. Accepted recipients are not replayed; interrupted provider calls become uncertain for manual reconciliation. Existing unsubscribe/bounce/complaint checks and per-recipient idempotency keys remain in place.

The Communications table polls read-only progress while a campaign is sending. Closing the panel, navigating away, or closing the browser does not cancel queued work. “Accepted” is provider acceptance, not inbox delivery. Failed and uncertain recipients are displayed separately.

## Verification

Run the worker unit tests and the campaign delivery integration test against session-local temporary tables with a fake transport. Never test background delivery against a real campaign just to validate the worker. Verify production scheduler operation after deployment before a new live campaign is queued.
