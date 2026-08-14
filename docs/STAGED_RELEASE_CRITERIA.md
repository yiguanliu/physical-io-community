# Staged Release Acceptance & Rollback Criteria

**Issue:** PHY-57  
**Parent:** PHY-42 — Stage 0 gate: approve product and architecture baseline  
**Source plan:** `ADMIN_MEMBERS_COMMUNICATIONS_PLAN.md`

This document defines measurable **entry**, **exit**, **rollback**, and **operational readiness** criteria for every delivery stage of the Physical I/O members, communications, and sponsor-outreach platform.

No stage may start without its entry criteria. No stage may be marked complete without its exit criteria. Production promotion requires operational readiness. Rollback criteria are trigger conditions, not optional guidance.

---

## How to use these gates

| Term | Meaning |
| --- | --- |
| **Entry** | Preconditions that must be true before implementation work for the stage begins in earnest |
| **Exit** | Acceptance conditions that must be true before the stage is declared done and the next stage may start |
| **Rollback** | Observable failure conditions that require reverting or disabling the stage’s production exposure |
| **Operational readiness** | People, runbooks, monitoring, and access controls required to operate the stage safely in production |

### Gate owners

| Gate decision | Owner |
| --- | --- |
| Product scope / MVP boundary | Product owner |
| Architecture / security acceptance | Engineering lead + security reviewer |
| Production promote / rollback | On-call engineer with product owner confirmation for member-facing or outbound-comms impact |
| Consent / retention wording | Product owner + legal/privacy reviewer |

### Severity and rollback class

| Class | Example | Default action |
| --- | --- | --- |
| **R0 — Immediate** | Auth bypass, unprotected PII exposure, mass unintended email send | Disable feature flags / routes, revoke sessions or API keys as needed, restore last known-good deploy |
| **R1 — Same day** | Broken import corrupting member rows, webhook signature failures, consent sync incorrect | Pause writes/sends, fix forward or roll back schema-compatible code |
| **R2 — Planned** | Non-critical UI defect, reporting lag, cosmetic campaign metrics | Fix forward within the stage; no production rollback unless exit criteria fail |

Rollback preference order:

1. Feature flag / route disable (fastest, lowest blast radius)
2. Provider kill-switch (pause Resend/push/workflows)
3. Application deploy rollback to previous Vercel production deployment
4. Database restore only when data corruption is confirmed and irreversible by compensating writes

Database restores require explicit owner approval and a written impact note.

---

## Cross-cutting requirements (all stages)

These apply from Stage 1 onward unless a stage explicitly narrows them.

### Automated tests — critical path

Every production-facing stage must ship automated coverage for the critical path introduced in that stage. Minimum bar:

| Layer | Required |
| --- | --- |
| Unit / integration | Authorization predicates, consent state transitions, idempotency keys, webhook signature verification |
| Contract / API | Authenticated route handlers and server actions reject unauthenticated and unauthorized callers |
| End-to-end (preview or CI against ephemeral DB) | At least one happy path and one negative path for the stage’s primary user journey |
| Migration | `supabase db reset` recreates schema from committed migrations on a clean database |

Critical-path journeys by domain:

- **Auth / admin:** invite → sign-in → session validation → protected `/admin` access → session revocation
- **Members:** import or join → profile ownership checks → preference update → suppression honored
- **Email:** draft → test send → approved send → webhook updates delivery/unsubscribe state without duplicates
- **Outreach:** assigned lead access → draft → human approval → send → reply stops sequence
- **Member self-serve:** register → verify email → complete onboarding → edit own profile only

A stage cannot exit if any critical-path automated test is skipped, flaky without quarantine ticket, or failing on `main`/release branch.

### Security and audit baseline

Documented once here; each stage lists stage-specific additions.

| Control | Requirement |
| --- | --- |
| Auth boundary | Supabase Auth session validated server-side; never trust client-supplied user/role IDs |
| Data access | Protected schemas unreachable via browser Supabase Data API (`anon` / `authenticated` denied) |
| Secrets | Service-role, Resend, OAuth, DocuSign, and DB URLs server-only; no browser exposure |
| Audit log | Append-only records for sensitive reads (commercial/PII exports) and all privileged mutations |
| Webhooks | Signature verification required before state changes; events stored idempotently |
| Environments | Separate local / preview / production DBs; no live member or lead data in preview |
| Retention | Consent, campaign, import, and audit retention periods recorded before first outbound marketing send |

Security/audit implications that must appear in the stage exit packet:

1. New permission resources or role changes
2. New PII fields or processors (Resend, push, DocuSign, OpenRouter, Google)
3. New outbound communication channels
4. New webhook or automation entry points
5. Changes to retention, deletion, or export behavior

---

## Stage map

Aligned to PHY-42 staged delivery and `ADMIN_MEMBERS_COMMUNICATIONS_PLAN.md` MVPs.

| Stage | Name | Primary outcome |
| --- | --- | --- |
| **0** | Product & architecture baseline | Approved implementation baseline |
| **1** | Platform foundation | Server-capable app, Supabase Auth admin, member import, admin member UI |
| **2** | Communications MVP | Consent-aware email campaigns, events, delivery tracking |
| **3** | Member onboarding & dashboard | First-party `/join`, claim, member dashboard foundation |
| **4** | Sponsor outreach MVP | Assigned CRM, approved outreach sends, reply tracking, delivery checklist |
| **5** | Expansion & hardening | Push, advanced automation, community features, full hardening |

Later plan phases (push, community directory, full DocuSign API, advanced scoring) land in Stage 5 or as explicit follow-on gates under Stage 5—not as silent scope creep inside Stages 1–4.

---

## Stage 0 — Product & architecture baseline

**Linear:** PHY-42  
**Outcome:** A reviewed implementation baseline that resolves product scope, architecture, permissions, data handling, and staged delivery.

### Entry

- Platform project chartered with product owner and engineering owner named
- Working draft of architecture and MVP boundaries available for review (`ADMIN_MEMBERS_COMMUNICATIONS_PLAN.md` or successor)
- PHY-57 criteria document drafted (this file)

### Exit

- [ ] MVP boundaries approved in writing (admin communications MVP, member onboarding MVP, outreach MVP; push and community directory deferred)
- [ ] System and data ownership documented (Supabase Auth identity; Supabase Postgres system of record; Google Sheets intake-only until cutover; Resend delivery)
- [ ] Member / admin / outreach permission matrix approved
- [ ] Consent and retention decisions recorded (including `consent_unknown` handling for legacy signups)
- [ ] Technical decision records accepted (Supabase Auth + Supabase Postgres + server-only access + Drizzle + Supabase SQL migrations + Vercel Workflow)
- [ ] This staged release criteria document accepted
- [ ] Stage 1 issues ready to implement (scoped, unblocked, owners assigned)

### Rollback

Stage 0 has no production surface. “Rollback” means **reject the baseline**:

- Reopen disputed decisions (auth, data access, consent, MVP scope)
- Block Stage 1 implementation start until exit checklist is re-satisfied

### Operational readiness

- Decision log location agreed (Linear parent issue comments and/or `docs/`)
- Reviewers identified for security, privacy/consent, and product scope
- No production credentials required yet; preview/prod project naming convention agreed

### Security & audit implications

- Establishing server-only DB access and invitation-only admin as non-negotiable defaults
- Recording that legacy Google Form rows lack explicit marketing consent → must not be auto-enrolled
- Accepting audit-log and permission-matrix obligations before code lands

### Automated tests

None required for Stage 0. Stage 1 entry requires a CI skeleton plan (test runner + migration check) committed or ticketed with owner.

---

## Stage 1 — Platform foundation

**Maps to:** Admin Delivery Phase 1  
**Outcome:** Production-capable foundation with invitation-only admin auth, schema migrations, member import, and member admin UI. No broad marketing sends.

### Entry

- Stage 0 exit complete
- Vercel project and Supabase project provisioned for preview and production (empty or synthetic data only in preview)
- Sending domain *not* required yet; admin invite allowlist decided
- CI plan for lint, typecheck, migrations, and auth smoke tests agreed

### Exit

- [ ] Static-export-only constraint removed; Next.js runs with server routes on Vercel
- [ ] Supabase migrations committed; `supabase db reset` succeeds from scratch
- [ ] Supabase Auth configured with invitation-only administrator enrollment
- [ ] `/admin` and protected server actions reject unauthenticated and non-admin users
- [ ] Protected schemas denied to Supabase Data API `anon` / `authenticated` roles
- [ ] Google Sheet initial import: normalize, dedupe, validate, reject-queue, source-row traceability
- [ ] Admin member list + detail usable for search/filter of imported members
- [ ] Sensitive admin mutations written to `audit_log`
- [ ] Critical-path automated tests green (auth invite/sign-in/revoke; member ownership isolation; Data API denial; migration reset)
- [ ] Security/audit notes for Stage 1 attached to release packet

### Rollback triggers

| Trigger | Class | Action |
| --- | --- | --- |
| Unauthenticated or horizontal privilege access to `/admin` or member PII | R0 | Disable `/admin` routes; rotate session secret if compromise suspected; roll back deploy |
| Service-role or DB credentials exposed to client bundle | R0 | Rotate credentials; roll back deploy; audit access logs |
| Import writes corrupt or duplicate production members irreversibly | R1 | Pause import; restore from pre-import backup or compensating dedupe; freeze Stage 2 |
| Migration fails mid-apply leaving production schema inconsistent | R1 | Stop deploys; repair via forward migration or approved restore |

### Operational readiness

- [ ] Admin invite and offboarding runbook (session revocation steps)
- [ ] Supabase backup enabled; restore drill documented
- [ ] Secret inventory and ownership (Supabase Auth, DB URLs, Google Sheet access)
- [ ] Preview deploys use synthetic seed data only
- [ ] On-call contact for auth/import failures named

### Security & audit implications

- First storage of member PII in Postgres → access logging and export controls begin
- Invitation-only admin and role checks become production security boundary
- Import creates audit trail obligation for create/update/reject decisions
- Google Sheet remains raw intake; Supabase becomes operational source of truth after import

### Critical-path tests (must automate)

1. Unauthenticated request to `/admin` → denied  
2. Member-role session cannot access admin member APIs  
3. Admin can read imported member; non-owner paths do not leak other admins’ privileged actions beyond policy  
4. Public Data API cannot `SELECT` protected member tables  
5. Duplicate import of same normalized email does not create duplicate active members  
6. Revoked session cannot call protected server action  

---

## Stage 2 — Communications MVP

**Maps to:** Admin Delivery Phases 2–3 (email + events/automation); **excludes** push (Phase 4)  
**Outcome:** Consent-aware newsletters and event emails with test/send/schedule, Resend webhooks, suppression, and campaign reporting.

### Entry

- Stage 1 exit complete and stable in production for at least one import+admin usage cycle (or explicit waiver from product owner)
- Physical I/O sending domain chosen; DNS access available
- Consent wording and privacy notice approved
- Policy for `consent_unknown` legacy members approved (no silent marketing enrollment)
- Resend account and webhook endpoint plan ready

### Exit

- [ ] Sending domain verified (SPF/DKIM); monitored from/reply-to configured
- [ ] Newsletter and event-email composer with audience filters, preview, draft, test send
- [ ] Send-confirmation safeguard for production audiences
- [ ] Consent, topic preferences, bounce, complaint, and unsubscribe suppression enforced before send
- [ ] Resend webhooks verified, idempotent, and update campaign/subscription state
- [ ] Events list with announcement and reminder actions
- [ ] Campaign reporting for delivery/bounce/complaint/unsubscribe
- [ ] Rate limiting and idempotent send keys prevent duplicate campaign sends
- [ ] Critical-path automated tests green
- [ ] Security/audit notes for Stage 2 attached (includes processor list: Resend)

### Rollback triggers

| Trigger | Class | Action |
| --- | --- | --- |
| Emails sent to suppressed, unsubscribed, or `consent_unknown` marketing audiences | R0 | Pause all campaigns; enable provider kill-switch; roll back send path; notify affected members if required by policy |
| Webhook acceptor processes unsigned or forged events | R0 | Disable webhook route; rotate secrets; rebuild state from provider as needed |
| Duplicate mass send due to missing idempotency | R0 | Pause scheduler/workflows; kill-switch Resend; incident review before re-enable |
| Preference sync fails open (sends continue after unsubscribe) | R0 | Local suppression must win immediately; pause outbound until sync corrected |
| Scheduling incorrectly fires in production during preview testing | R1 | Disable schedulers; audit sent set; fix environment guards |

### Operational readiness

- [ ] Campaign kill-switch runbook (app flag + Resend pause)
- [ ] Webhook failure alerting and replay procedure
- [ ] Suppression list export and manual block procedure
- [ ] DNS/email deliverability owner named
- [ ] First production send requires dual confirmation (operator + product owner)

### Security & audit implications

- Outbound marketing becomes a regulated processing activity → consent evidence and wording versions mandatory
- Webhooks are unauthenticated public HTTP entry points → signature verification and idempotency are security controls
- Campaign audience snapshots must be auditable after segment rules change
- Audit log must record who approved/sent campaigns and which segment/consent filters applied

### Critical-path tests (must automate)

1. Member without marketing consent excluded from newsletter audience resolution  
2. Unsubscribe/complaint webhook suppresses future sends idempotently  
3. Duplicate webhook delivery does not double-apply state  
4. Test send cannot target full production segment without confirmation path  
5. Non-`message:send` role cannot trigger production send  
6. Scheduled job in preview cannot enqueue production provider sends  

---

## Stage 3 — Member onboarding & dashboard

**Maps to:** Member Phases 1–3 (identity/migration, first-party onboarding, dashboard foundation)  
**Outcome:** Verified member accounts, legacy claim, `/join` questionnaire, profile/preferences, account controls. Google Form retired from primary navigation after cutover window.

### Entry

- Stage 1 exit complete (member tables and auth foundation)
- Stage 2 consent model available or explicitly versioned so onboarding can write compatible consent records
- Privacy notice / terms versions ready to stamp on acceptance
- Cutover window length and fallback policy approved
- Bot protection and rate-limit approach chosen for public registration

### Exit

- [ ] Supabase Auth member registration + email verification live
- [ ] Admin enrollment remains invitation-only and separated from member role
- [ ] Legacy profile claim only after verified email; no account enumeration; ambiguous matches → admin review
- [ ] `/join` resumable questionnaire with server-side validation and draft persistence
- [ ] Explicit consent/privacy choices stored with version + timestamp; no preselected optional consents
- [ ] Member dashboard: home, profile edit, communication preferences, session/account controls
- [ ] Data export and deletion request flows implemented per retention policy
- [ ] Preference changes persist locally first; optional messages suppressed immediately on withdrawal
- [ ] Google Form cutover steps 1–6 from the plan completed or scheduled with owners; Sheets not used as operational DB afterward
- [ ] Critical-path automated tests green
- [ ] Security/audit notes for Stage 3 attached

### Rollback triggers

| Trigger | Class | Action |
| --- | --- | --- |
| Member can access `/admin` or another member’s PII | R0 | Disable member dashboard and `/join` mutations; roll back; force session revocation |
| Unverified email auto-links to legacy profile | R0 | Disable claim flow; audit linked accounts; reverse unsafe links |
| Deletion workflow leaves PII publicly readable or fails to revoke sessions | R0 | Disable deletion UI; manual containment; fix before re-enable |
| Onboarding writes invalid consent or activates membership without required acceptances | R1 | Pause `/join` completion; keep drafts; fix validation |
| Cutover dual-write/confusion causing duplicate identities | R1 | Freeze Form and/or `/join` per runbook; reconcile; extend cutover |

### Operational readiness

- [ ] Cutover runbook (Form → claim → `/join` → retire Form link)
- [ ] Member support path for failed claims and deletion requests
- [ ] Rate-limit / abuse monitoring on signup, verify, reset, claim
- [ ] Retention schedule published for drafts, consents, activity, and deleted-account residuals

### Security & audit implications

- Public registration expands attack surface (enumeration, bot signups, claim fraud)
- Members and admins share one Supabase Auth project → role separation is a hard security boundary
- Consent evidence becomes member-authored, not only admin-imported
- Account deletion must preserve legally required commercial/audit records while removing eligible PII
- Audit events for claim, consent change, export, and deletion are mandatory

### Critical-path tests (must automate)

1. Member session cannot access `/admin` or outreach tables  
2. Member can read/update only own profile  
3. Claim denied for unverified email; no existence oracle in error text  
4. Onboarding completion rejected without required privacy/terms acceptance  
5. Withdrawal of optional email consent suppresses sends even if provider sync pending  
6. Suspended member cannot access active-member resources  
7. Deletion revokes sessions and removes/anonymizes eligible PII per policy  

---

## Stage 4 — Sponsor outreach MVP

**Maps to:** Outreach Phases 1–2 plus MVP slice of Phases 3–5 (AI draft assist, Workflow controls, Meet links, proposal/DocuSign *status links*, delivery checklist)  
**Outcome:** Assigned-admin CRM from lead → approved send → reply tracking → sponsor-won delivery checklist. No fully autonomous sequences.

### Entry

- Stage 1 permission model extended with outreach resources (`lead`, `message`, `template`, etc.) approved
- Stage 2 email sending stack proven (or dedicated outreach sending domain ready)
- Outreach data classification and audit requirements accepted (commercial sensitivity)
- Human approval required before any external outreach send (non-negotiable for MVP)
- OpenRouter/Google/DocuSign usage boundaries documented (AI drafts only; DocuSign deep links acceptable)

### Exit

- [ ] Organisations, contacts, leads, assignments, statuses, tasks, timeline in Supabase as system of record
- [ ] Pipeline + lead workspace; assigned-admin access enforced (role alone insufficient for all leads)
- [ ] Draft → review → approval → test → send workflow with immutable sent records
- [ ] Inbound reply webhooks thread to leads; sequences/tasks pause on reply
- [ ] AI draft generation cannot send; claims requiring approval flagged
- [ ] Workflow run history with cancel/retry/manual-review controls
- [ ] Google Meet creation and proposal/DocuSign status links from lead workspace
- [ ] Sponsor-won conversion rules + delivery checklist
- [ ] Emergency stop / automation pause controls verified
- [ ] Critical-path automated tests green
- [ ] Security/audit notes for Stage 4 attached

### Rollback triggers

| Trigger | Class | Action |
| --- | --- | --- |
| Outreach email sent without human approval | R0 | Kill-switch outreach sends and workflows; roll back send path |
| Admin can read/update leads they are not assigned to (beyond explicit elevated role) | R0 | Disable outreach routes; fix authorization; audit access |
| AI-generated content sent verbatim without approval gate | R0 | Disable AI draft→send path; require manual composer only |
| DocuSign or commercial status incorrectly marked signed/won from unverified signal (e.g. email open) | R1 | Freeze status transitions; correct records; tighten rules |
| Workflow retries duplicate external emails | R0 | Cancel workflows; enforce idempotency; pause automation |

### Operational readiness

- [ ] Outreach kill-switch and approval-bypass prohibition confirmed in runbook
- [ ] Lead assignment / offboarding procedure (reassign before revoking admin)
- [ ] Commercial data access audit review cadence agreed
- [ ] Provider incident contacts (Resend, Google, DocuSign, OpenRouter)

### Security & audit implications

- Commercial PII and deal data require stricter audit (sensitive reads + mutations)
- Assignment-scoped authorization is an application security control, not only UX filtering
- AI providers may receive lead context → minimize payloads; no secrets; log when externalized
- Agreement/finance permissions remain separate from `message:send`
- Webhooks and Workflows expand privileged automation surface → cancel/retry rights audited

### Critical-path tests (must automate)

1. Outreach contributor accesses only assigned leads  
2. Approver without `message:send` cannot send  
3. Send without approval record is rejected  
4. Duplicate workflow start does not send duplicate email  
5. Inbound reply idempotently pauses follow-up tasks  
6. Member role cannot read outreach schema via any app route  
7. Emergency stop prevents new workflow external side effects  

---

## Stage 5 — Expansion & hardening

**Maps to:** Admin Phase 4–5, Member Phases 4–5, remaining Outreach advanced items  
**Outcome:** Push notifications (after email consent proven), events/resources expansion, optional community directory, deeper automation/DocuSign API, and platform hardening.

Stage 5 may be split into separately gated sub-releases (5a push, 5b community, 5c advanced outreach). Each sub-release inherits this stage’s criteria pattern.

### Entry

- Stages 2 and 3 consent/suppression proven in production (required before push)
- Hardening backlog prioritized (rate limits, audit completeness, a11y, backups/exports)
- For community directory: moderation and visibility rules approved
- For DocuSign API: legal/finance permission matrix and void/send controls approved

### Exit (platform hardening baseline — required)

- [ ] Audit log coverage complete for privileged actions defined in permission matrix
- [ ] Rate limiting on auth, import, send, signup, and claim endpoints verified
- [ ] Idempotent schedulers: no duplicate campaign or outreach sends under retry
- [ ] Accessibility and responsive QA signed off for admin and member primary flows
- [ ] Backup + export workflows documented and tested
- [ ] End-to-end suite covers authorization, imports, consent, unsubscribes, scheduling, and outreach approval
- [ ] Security/audit notes updated for any new processors or surfaces

### Exit (optional sub-releases — each independently gated)

**5a Push**

- [ ] Managed provider configured; service worker + explicit browser permission
- [ ] Push consent evidence stored; separate from email consent
- [ ] Composition, segmentation, test, report, expired subscription cleanup
- [ ] Rollback kill-switch for push independently of email

**5b Community**

- [ ] Opt-in directory only; field-level visibility enforced server-side
- [ ] Moderation path before public exposure of bios/links
- [ ] Connection requests with privacy controls

**5c Advanced outreach**

- [ ] Automatic sequences only after manual MVP reliability review
- [ ] Embedded DocuSign API with verified webhooks; never infer acceptance from opens/clicks
- [ ] Renewal workflows with explicit owner assignment

### Rollback triggers

| Trigger | Class | Action |
| --- | --- | --- |
| Push sent without push consent or after withdrawal | R0 | Disable push provider; purge bad segments |
| Directory exposes non-opt-in members or hidden fields | R0 | Take directory offline; fix visibility queries |
| Hardening regression re-opens Stage 1–4 R0 class bugs | R0 | Roll back sub-release; re-enter prior stage exit checks |
| DocuSign API voids/sends with wrong permission | R0 | Disable agreement API actions; preserve deep-link-only mode |

### Operational readiness

- [ ] Per-channel kill-switches (email, push, outreach workflows, directory)
- [ ] Quarterly access review for admin and outreach roles
- [ ] Retention enforcement job owners and monitoring
- [ ] Load/failure playbooks for providers used in production

### Security & audit implications

- Push introduces browser permission + device identifiers → separate consent and retention
- Community features change confidentiality posture among members
- Advanced automation increases blast radius → stronger approval and stop controls
- Hardening stage is where deferred RLS identity propagation may be reconsidered; default remains server-only access unless a written security review says otherwise

### Critical-path tests (must automate)

1. Prior stage critical paths remain green (no regressions)  
2. Push audience excludes users without push consent  
3. Directory queries honor opt-in and field visibility  
4. Duplicate scheduled jobs do not double-send  
5. Permission matrix spot-checks for finance/legal/outreach separation  

---

## Critical-path test matrix (summary)

| Capability | S1 | S2 | S3 | S4 | S5 |
| --- | --- | --- | --- | --- | --- |
| Admin authN/Z + session revoke | ✓ | ✓ | ✓ | ✓ | ✓ |
| Data API denial on protected schemas | ✓ | ✓ | ✓ | ✓ | ✓ |
| Member import integrity | ✓ | | | | ✓ |
| Consent / suppression before send | | ✓ | ✓ | ✓ | ✓ |
| Webhook signature + idempotency | | ✓ | | ✓ | ✓ |
| Member self-access only | | | ✓ | ✓ | ✓ |
| Legacy claim safety | | | ✓ | | ✓ |
| Outreach assignment + approval gate | | | | ✓ | ✓ |
| Workflow/send idempotency | | ✓ | | ✓ | ✓ |
| Channel-specific consent (push/directory) | | | | | ✓ |

✓ = required automated coverage before stage exit.

---

## Production promotion checklist (every stage ≥ 1)

Copy into the release PR / Linear gate comment:

1. Entry criteria were met on start date: ____  
2. Exit checklist completed with evidence links (CI, screenshots, migration notes)  
3. Critical-path tests: CI URL ____  
4. Security & audit implications section reviewed by ____ on ____  
5. Operational readiness checkboxes complete; runbooks linked  
6. Rollback class R0 alarms/alerts configured for new failure modes  
7. Feature flags / kill-switches identified: ____  
8. Go / no-go: Product ____ Engineering ____ (Security if PII/comms surface changed)

---

## Acceptance for PHY-57

This document satisfies PHY-57 when:

- [x] Every stage (0–5) has measurable entry, exit, rollback, and operational readiness criteria
- [x] Automated tests are specified for each stage’s critical path
- [x] Security and audit implications are documented per stage and cross-cutting

**PHY-42 dependency:** Stage 0 exit includes acceptance of this document and readiness of Stage 1 issues.
