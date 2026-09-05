# Google Sheets → Members

Source: [Physical I/O Signup Questionnaire](https://docs.google.com/spreadsheets/d/1c-_QhErVJrSDMo0kYyYoGTYETtYLJ0fxJmgIebCAukU/edit#gid=1208179166), tab `Form Responses 1`.
Destination: `https://physical-io.com/api/integrations/google-sheets/members`.

## Activation

1. Apply `supabase/migrations/20260905160000_google_sheet_member_sync.sql` to the member database.
2. Generate a random secret with `openssl rand -hex 32`. Add it as the server-only production environment variable `GOOGLE_SHEETS_SYNC_SECRET`. The endpoint uses the existing `DATABASE_URL`. Never put the database credential in Google Sheets or Apps Script.
3. Deploy this branch to the community website. Unsigned calls should return 401 (503 means environment configuration is missing).
4. Create a standalone project at https://script.google.com and paste `scripts/google-sheets/MemberSync.gs` into `Code.gs`.
5. In Project Settings → Script properties, add `GOOGLE_SHEETS_SYNC_SECRET` with the same secret. Restrict script edit access to administrators: editors can read its properties.
6. Run `installMemberSync`, authorize the Google permissions, then review execution counts. It reconciles once, then installs form-submit, manual-edit and five-minute triggers. No email is sent. Google authorization must be completed by the Google account owner.
7. Verify `member.sheet_sync` entries in the admin audit log and Script Properties `LAST_SYNC`. Apps Script Executions records errors; failed batches are rolled back and retried. Call `stopMemberSync` to remove this project's sync triggers.

## Data rules

Email, trimmed and lowercased, is the member identity. Repeated rows merge by email; later nonempty sheet values win. Changing an email is a new identity: correct/merge email changes in admin rather than using the sheet to rename identities. Invalid rows stop the reconciliation for correction (the error identifies the sheet row, without exposing its email). Do not change the column headings without updating the mapping.

New members enter `review` and have no subscriptions added. Initial matching records only have blank fields filled. On later syncs, a field updates only if the current database value matches the preceding sheet snapshot, protecting independent admin edits. Blank answers never erase existing fields. Deleting sheet rows never deletes members. Notes, member status, email status and all subscriptions remain untouched.

Mapped fields: name, email, city, professional role, experience, website, LinkedIn and community suggestions. Other questionnaire answers remain in the sheet. The source-state table has RLS enabled with no browser grants. Requests are HMAC-SHA256 signed with a five-minute window, limited to 100 rows/512KB, deduplicated by request ID, ordered by snapshot time, and applied transactionally. Concurrent runs from this script are serialized.

One complete reconciliation may contain multiple atomic batches. A later batch failure does not undo earlier successful batches; the next reconciliation safely retries. Trigger/API changes not covered by edit triggers are picked up by the five-minute reconciliation. This is eventual synchronization, not an instantaneous or two-way mirror.
