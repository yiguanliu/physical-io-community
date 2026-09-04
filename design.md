# Physical I/O Design

## Purpose

Physical I/O is a London community site for people building Physical AI, robotics, spatial intelligence, wearables, embodied AI, and intelligent hardware.

The product has two surfaces:

- Public marketing pages that establish the community, explain the mission, and drive visitors to join.
- A private admin workspace for member management, consent-aware communications, events, and sponsor outreach.

The public site should feel sharp, minimal, and physical: a small number of deliberate visual moments, strong typography, high contrast, and restrained use of paprika orange. The admin workspace should feel operational: dense, scannable, calm, and efficient for repeated work.

## Audience

Primary public audiences:

- Founders, engineers, researchers, designers, and students working near robotics, AI, HCI, hardware, and spatial computing.
- Investors, sponsors, and operators looking for early access to the London Physical AI ecosystem.
- Potential speakers, mentors, and industry partners.

Admin users:

- Physical I/O operators who need to manage signups, consent, campaigns, events, sponsor leads, and access requests.

## Product Principles

- Lead with the community, not a generic technology brand.
- Keep the public experience concise; long-form detail belongs on `/about`.
- Make membership conversion obvious without turning the site into a marketing funnel.
- Treat admin data as operational and sensitive. Admin screens should prioritize clarity, permission boundaries, and reversible workflows.
- Respect reduced-motion preferences on animated and WebGL-heavy surfaces.

## Routes

| Route | Purpose | Indexing |
| --- | --- | --- |
| `/` | One-screen home stage with brand, positioning, focus areas, audience, and join CTA. | Indexed |
| `/about` | Long-form explanation of why the community exists, how it operates, who it serves, roadmap, FAQ, and final CTA. | Indexed |
| `/network` | Visual prototype of the member network. | Noindex |
| `/unsubscribe` | Email unsubscribe flow. | Public utility |
| `/admin/login` | Admin sign-in and access request. | Noindex |
| `/admin` | Workspace overview with setup warnings, metrics, sponsor pipeline, campaign activity, and audit log. | Protected |
| `/admin/members` | Search, filter, import, select, create, and edit community members. | Protected |
| `/admin/campaigns` | Draft, test, send, and review email campaigns. | Protected |
| `/admin/events` | Manage event records used by campaign targeting and communications. | Protected |
| `/admin/outreach` | Sponsor CRM pipeline, lead details, notes, and one-to-one outreach. | Protected |
| `/admin/access` | Approve or decline administrator access requests. | Protected |
| `/api/webhooks/resend` | Resend event webhook for campaign delivery state. | Server route |

## Visual System

### Brand

- Use the committed Physical I/O logo via `components/LogoMark.tsx`.
- Do not redraw the logo or replace it with text-only branding.
- Keep the brand signal visible in the first viewport on public pages.

### Typography

- Primary typeface: Host Grotesk via `app/layout.tsx`.
- Global stack: `"Host Grotesk", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`.
- Public headings are large, tightly set, and minimal.
- Admin text defaults to compact 10pt UI text, with user preferences for 10pt, 11pt, 12pt and alternate sans-serif font stacks.

### Color

Public palette:

- White: `#ffffff`
- Black: `#000000`
- Paprika orange: `#ee4b1a`
- Soft ink and line colors via rgba black.

Admin palette:

- Background: `#f3f2ed`
- Panel: `#ffffff`
- Ink: `#171714`
- Muted: `#77766f`
- Line: `#deddd6`
- Accent: `#ee4b1a`

Avoid expanding the dominant palette without a product reason. The public site intentionally uses white, black, and paprika orange as the core identity.

### Layout

Public:

- Home is a single `100dvh` stage over auditorium imagery.
- About uses centered, narrow content sections with generous vertical rhythm.
- CTAs are direct and sparse.
- FAQ is an accordion, supported by JSON-LD.

Admin:

- Fixed left sidebar on desktop.
- Sticky topbar with breadcrumb, search entry, text preferences, and primary action.
- Dense cards, tables, panels, kanban columns, and forms.
- Mobile collapses the sidebar and keeps table-heavy views horizontally scrollable where needed.

### Motion

- Home carousel auto-advances every 10 seconds.
- User interaction pauses auto-advance for 20 seconds.
- Supported input: click left/right side of stage, swipe, wheel, and arrow keys.
- Slide content animates with GSAP blur/fade/translate.
- `prefers-reduced-motion: reduce` disables automatic movement and uses instant slide reveal.
- WebGL effects are client-only.

## Public Content Model

Shared public copy and links live in `lib/site.ts`.

Key exported data:

- `SITE_URL`, `JOIN_URL`, `DECK_URL`
- Social links
- Focus areas
- Community-building formats
- Audience list
- Member organisation display list
- Structure tiers
- Roadmap
- FAQ entries

When updating public messaging, prefer editing `lib/site.ts` instead of scattering copy across components, unless the copy is page-specific.

## Admin Workspace Design

The admin workspace is a server-backed operational surface, not only a mockup.

Core areas:

- Members: imported Google Form signups plus manually added members; search, filters, statuses, consent, suppression, and import.
- Campaigns: drafts, audience counts, test sends, mass sends, delivery records, and webhook updates.
- Outreach: organisations, contacts, sponsor leads, pipeline stages, notes, messages, and activity history.
- Events: records used for announcements and targeting.
- Access: invitation-style admin approval flow.

Admin UX requirements:

- Every sensitive action should have server-side authorization.
- Campaign sends must honor newsletter/event consent, unsubscribe, bounce, and complaint state.
- Missing production configuration should surface as an explicit warning, not silent partial behavior.
- Operators should be able to understand system state from the overview page without opening every module.

## Technical Architecture

Runtime:

- Next.js 15 App Router
- React 19
- TypeScript
- pnpm

Rendering:

- Public and admin routes use App Router server components by default.
- WebGL and animated browser-only pieces are isolated behind client components and dynamic imports.
- The current codebase includes server routes and server actions, so it should be treated as a server-capable Next app rather than a purely static export.

Data:

- Local/default admin database is libSQL through Drizzle ORM.
- Local development writes to `data/physical-io-admin.db`.
- Vercel without `TURSO_DATABASE_URL` falls back to `/tmp/physical-io-admin.db`, which is ephemeral and unsafe for production persistence.
- Production persistence should use a hosted libSQL-compatible database such as Turso with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
- Drizzle migrations live in `drizzle/`.
- Supabase SQL migrations and seed assets live in `supabase/`.

Auth:

- Current implementation uses Supabase Auth session utilities through `@supabase/ssr`.
- Admin profile and role checks are server-side.
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` is required for persistent admin role management.
- Admin access is allowlist/approval based; `soul@physical-io.com` is always treated as admin by policy.

Email:

- Resend is optional in development.
- Without `RESEND_API_KEY`, campaign sends are blocked with an explicit setup error.
- Resend webhook handling lives at `app/api/webhooks/resend/route.ts`.

State:

- Public home slide state uses Zustand.
- Admin preference state is stored in `localStorage`.

## Data Model

Primary application tables are defined in `lib/db/schema.ts`.

Important domains:

- Auth-shaped tables: `user`, `session`, `account`, `verification`
- Community: `members`, `member_interests`, `subscriptions`
- Campaigns: `campaigns`, `campaign_recipients`, `campaign_events`
- Sponsor outreach: `organisations`, `contacts`, `leads`, `lead_activities`, `outreach_messages`
- Events: `community_events`
- Governance: `audit_log`

Design expectations:

- Member email matching uses normalized email.
- Legacy signups can have unknown consent and must not be silently included in marketing sends.
- Campaign sends need idempotency keys.
- Provider webhook events should be processed idempotently.
- Sensitive mutations should leave audit records.

## SEO And Metadata

- `/` includes Organization and WebSite JSON-LD.
- `/about` includes AboutPage and FAQPage JSON-LD.
- Public metadata should use canonical routes and Physical I/O-specific descriptions.
- `/network` and admin pages should remain noindex.
- `public/sitemap.xml`, `public/robots.txt`, and `SITE_URL` must stay aligned before launch.
- Add `public/assets/og.png` and wire it into metadata before final public launch.

## Assets

Committed assets:

- `public/assets/logo.svg`
- `public/assets/favicon.svg`
- `public/assets/home_bg.jpg`
- `public/assets/home_bg_portrait.png`
- `public/assets/about_hero.jpg`
- `public/assets/cursor-logo.svg`

Home depends on the auditorium background and portrait variant. Avoid replacing those with abstract gradients or decorative vector backgrounds unless the product direction changes.

## Accessibility

- Respect `prefers-reduced-motion`.
- Keep inactive carousel slides hidden from interaction with `aria-hidden` and `inert`.
- Navigation and social links need descriptive labels.
- Admin icon buttons need `aria-label` and visible focus treatment.
- Table-heavy admin views should preserve semantic tables for member and campaign data.
- Color cannot be the only signal for critical states such as send readiness, consent, or errors.

## Development Workflow

Use pnpm:

```bash
pnpm dev
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Notes:

- There is a stray `package-lock.json`; use `pnpm-lock.yaml`.
- `sharp` build-script warnings are expected because images are unoptimized.
- There is no standalone lint script. `pnpm build` is the main Next.js validation gate.

## Documentation Drift To Resolve

The repository currently contains mixed historical architecture notes:

- `README.md` describes Supabase Auth, which matches the current dependency set and session utilities.
- `docs/database-authentication-architecture.md` describes a Better Auth target architecture, but Better Auth is not currently installed.
- Some older workspace instructions describe the site as statically exported, but `next.config.ts` currently does not set `output: "export"` and the app includes server routes/actions.

Before a production handoff, align these docs around the actual intended architecture.

## Open Launch Items

- Confirm final production domain and update `SITE_URL`, sitemap, and robots.
- Add and configure a 1200x630 Open Graph image.
- Confirm final Google Form or replace with first-party join flow.
- Verify contact links in the footer.
- Confirm member organisation names should be public.
- Configure persistent production database credentials.
- Configure Supabase admin secret and administrator approval workflow.
- Verify Resend sending domain, webhook secret, bounce/complaint handling, and unsubscribe path.
