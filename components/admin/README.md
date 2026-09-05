# ohi admin workspace

The parent `/admin` route renders `AdminMockup.tsx` (now the connected AdminWorkspace component), consuming `workspace-ui/src`. `app/admin/admin.css` contains scoped composition styles. The public website and separate LinkedIn `/outreach` application remain independent.

## Connected functionality

- Administrator password sign-in via existing Supabase Auth; API access requires server-verified `app_metadata.admin_role === "admin"`.
- Members: read, create, update, notes/links, interests, archive, CSV import, subscription evidence and bulk activation. Existing email addresses remain read-only because changing them requires consent review. Activation never grants marketing consent.
- Sponsor relationships: read, create and update company/contact details, stage, value and next action, with lead activity records.
- Campaigns: draft editing, selected-member audiences, consent-aware preview, test email and resumable batches of up to 10 recipients. Existing audience filters are retained. Scheduling remains manual; no scheduler runs in the background.
- Events: read, create and update details and time. The editor uses the browser's local timezone and stores UTC timestamps.
- Activity: reads the actual audit log. No automation runtime is configured, so no simulated jobs or approvals appear.
- Appearance preferences persist in browser localStorage. Business records persist in PostgreSQL, never localStorage.

## Implementation

`lib/admin/contracts.ts` defines client types, validation and role checks. `lib/admin/database.ts` maps the existing SQL tables and makes transactional mutations. `app/api/admin/workspace/route.ts` verifies the user on every request, checks mutation origins, handles validation errors, and returns no-store responses. Request IDs and transaction locks prevent duplicate retries. Data and audit changes commit together.

Uses existing tables from `supabase/migrations/20260814014839_admin_workspace.sql`: `members`, `member_interests`, `community_events`, `campaigns`, `organisations`, `contacts`, `leads`, `lead_activities`, and `audit_log`. No schema migration or seed import is needed. Those tables already have RLS enabled; the privileged database connection stays server-only behind the admin guard.

`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must reference the existing project. Admin accounts use the existing server-managed role; this implementation does not grant roles or create users.

Run the parent app with `npm run dev` (or `npm run dev -- --port 3200` if port 3000 is occupied). Visit `/admin` and sign in. Port 3100 is the separate design-system gallery.

## Checks

- `node --import tsx --test lib/admin/contracts.test.ts`
- `ADMIN_DB_TEST=1 node --env-file=.env.local --import tsx --test lib/admin/database.integration.test.ts` (explicit opt-in; all test writes roll back)
- `npx tsc --noEmit`
- `npm run build`

Database integration checks cover member creation/interests, bulk activation without consent changes, event updates, lead activity, draft persistence and audit entries. Anonymous API reads return 401 and cross-origin mutations return 403. Live authenticated browser checks require an existing administrator session; no auth bypass or test account is provisioned.

Live email requires the sender configuration below. Campaign scheduling and background automation still require a separate runtime.

## Login composition

`AdminSignIn.tsx` provides the shared sign-in view for signed-out `/admin` and the dedicated `/admin/login` page. It preserves Supabase password authentication and the admin role check. The split desktop composition uses the exact Physical I/O mark, shared fields/buttons and theme tokens; mobile collapses the brand artwork to prioritize the form. Password visibility and light/dark controls have accessible labels. Account provisioning remains administrator-managed.

The login keeps only the central brand mark, Sign in heading, labeled credentials, appearance/password visibility controls, submit action and necessary errors. Dark login surfaces are pure black; workspace dark surfaces retain their neutral charcoal tokens.

Login refinement: Physical I/O logo and name sit above “Admin Sign In”. The dark login uses a pure-black canvas, charcoal panel and subtly filled, borderless resting inputs; focus and invalid states remain visible.

## Account email flows

Create account opens an email confirmation dialog and requests a Supabase email OTP link with account creation enabled. The verified link opens `/admin/auth/confirm`, exchanges its PKCE code, and takes the user to `/admin/reset-password` to set a password. Forgot password uses `resetPasswordForEmail` with the same callback. No flow grants an admin role; an existing administrator must approve access separately.

Supabase must allow email signups and have working email delivery. Add the deployed origin's `/admin/auth/confirm` redirects (including `?flow=create` and `?flow=forgot`) to Auth redirect URLs; for this preview the origin is `http://localhost:3200`. Configure the email template to use the supplied confirmation URL. See [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords).

Remember me is a circular checkbox (so it can be deselected). It stores only the email after successful login, never the password; unchecking removes the stored email. It does not alter Supabase session lifetime.

Verified: production build, both dialogs, Escape dismissal, circular toggle, and narrow layout. Actual confirmation email delivery and password changes were not exercised against a user account.

## Marketing Content Studio

Content is integrated into the `/admin` navigation after Communications. Its native ohi interface is `MarketingWorkspace.tsx`, with a local export composer in `MarketingVisual.tsx`. It uses the existing community project's `content_items`, `content_platform_variants`, `content_assets`, `content_templates`, and `content_events` tables; no duplicate database or seed records are created.

- Board, list, editorial schedule, search/stage filters, and ready-to-post queue.
- Story creation/master drafts, source URLs, topics and ownership; platform copy for Instagram, LinkedIn, Website and Email; editorial templates; existing asset selection and previews; notes/timeline.
- Existing OpenAI discovery/drafting/adaptation helpers, with visibly labeled starter fallbacks when the provider is unavailable. Suggestions must be reviewed and explicitly saved.
- Local visual composer with the official logo, Manrope, image cover/split layouts, channel-sized PNG exports, and Markdown copy export. Local image previews are not uploaded or persisted.
- Review requires all saved intended channel variants to be ready. Edits invalidate previous approval. Published records require channel links; scheduled time is an editorial plan, not an automatic delivery job.

`/api/admin/marketing` checks the existing server-verified admin role, same-origin mutations, input validation, per-request idempotency and transactional audit/event writes. Master-draft saves detect stale versions. `/api/admin/marketing/assist` uses the same admin/origin protections. The dedicated newsletter delivery, remote media upload, AI image generation, and external posting services from the separate community app are not migrated or invoked here. No emails or social posts were sent during verification.

Checks: `ADMIN_DB_TEST=1 node --env-file=.env.local --import tsx --test lib/marketing/database.integration.test.ts` exercises approval gates, updates, stale drafts and audit records entirely inside a rollback transaction. `npm run build` validates the consuming app.


## Batch email setup and verification

Set `RESEND_API_KEY`, `RESEND_FROM` (a verified sender), and `NEXT_PUBLIC_SITE_URL` (this deployment, which serves `/unsubscribe`). Set `RESEND_WEBHOOK_SECRET` and register `/api/webhooks/resend` for delivered/opened/clicked/bounced/complained events. Missing configuration disables delivery instead of simulating success.

Delivery uses a session-mode PostgreSQL connection to coordinate campaign locks across server instances. `EMAIL_DATABASE_URL` can override `DATABASE_URL`; Supabase transaction-pooler port 6543 is mapped to its session-pooler port 5432. Other transaction proxies require an explicit session connection. Ordinary workspace queries continue using the normal pool. Production queries explicitly address `public` tables.

Each batch captures its audience, rechecks live consent/suppression, tracks recipient outcomes, and uses provider idempotency keys. Replaying the same request does not send another batch. An interrupted or uncertain send requires provider reconciliation; do not reset its status and resend blindly. “Sent” records provider acceptance, not verified inbox delivery. Webhook signatures and timestamps are checked before delivery/suppression updates. The `/unsubscribe` page asks for confirmation; `/api/email/unsubscribe` handles both confirmed and one-click POST updates.

Verification commands:

- `node --import tsx --test lib/admin/contracts.test.ts lib/email/webhook.test.ts`
- `ADMIN_DB_TEST=1 node --env-file=.env.local --import tsx --test lib/admin/database.integration.test.ts lib/admin/campaign-delivery.integration.test.ts lib/marketing/database.integration.test.ts`
- `npm run build`
- `npm --prefix workspace-ui run typecheck && npm --prefix workspace-ui run build && npm --prefix workspace-ui test && npm --prefix workspace-ui run build:gallery`

Delivery integration tests inject a mock transport, run against temporary shadow tables on a session connection, and explicitly drop those tables. Other database tests roll back. No real emails are sent by these checks. Member counts were checked after cleanup (99 persisted members). Live inbox delivery remains unverified because the verified sender is not configured in this checkout. Access-approval administration, scheduled job execution, and the content studio's remote media/newsletter services are not claimed as migrated functionality.


## Community repository integration

This workspace is integrated into `yiguanliu/physical-io-community` at `/admin`, protected by the existing `requireAdmin` server guard. The existing login and access-request routes remain authoritative. Detailed members, campaigns, content, events, access and outreach pages retain their existing route group and services. Reach detailed tools through the workspace menu. The prior overview is retained at `/admin/overview`. New workspace styles are in `app/admin/ohi.css`, separate from the existing admin stylesheet.

The replacement PR was type-checked and its offline unit tests run in this repository. Live mail delivery, concurrency between the two campaign interfaces, and authenticated browser parity still require review before merging. No database imports or credentials are committed.
