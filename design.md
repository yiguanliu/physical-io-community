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

## Content workspace editor (September 2026)

- Content types are named, shared categories, distinct from topic tags. New stories default to Editorial. News and Quotes are also provided; custom categories receive unique stored colours. Category badges always include their name; Minimal uses monochrome markers.
- The content table exposes Edit and a contextual Feature / Archive / Delete menu. Deletion requires confirmation; archived records remain available through the Stage filter.
- Schedule uses a navigable month/week calendar with Today, local time labels, an unscheduled list, and accessible date forms. Dragging proposes a date in the same form. Planning never bypasses publishing approval or triggers delivery.
- Visuals use a three-column composition: layers/presets, an aspect-correct canvas, and contextual properties. Preview/Edit and format selection sit outside the artwork. Narrow screens stack the canvas and controls; only the calendar/zoomed canvas scrolls horizontally.
- Text, images, official brand marks and shapes share explicit positions, dimensions, rotation, opacity and stacking. The editor includes keyboard movement, drag resizing, hide/lock, duplication, undo/redo, typography, alignment, crop/fit, shadow and image overlays.
- Layouts and shared presets persist through the authenticated, audited content API. Saving a changed visual returns approved content to review. Browser recovery drafts are versioned and never override a newer saved layout automatically.
- Instagram, LinkedIn, X, square post, website, email and custom dimensions are visual formats. A format choice does not add a publishing integration. PNG export uses the same SVG composition and embeds images and the bundled brand font.

### Workspace search appearance

Search fields use the semantic subtle grey background in their default, hover and focused states, with a transparent border and the existing visible keyboard-focus outline. Apply this consistently across admin collections; grey adapts to the selected light/dark palette.

### Collapsible admin navigation

The sidebar edge control toggles between full labels and a 64px icon rail. Keep all navigation targets accessible by name, show hover/focus labels, and retain the active-page indicator and workspace menu. Remember the user's choice on this device. Use the shared motion durations for width and label transitions and disable motion under reduced-motion preferences. Small screens keep the existing horizontal navigation.

The workspace menu lives at the far right of the top bar, alongside appearance controls and an icon-only Refresh action. Keep accessible names on all icon buttons.

### Event initiatives

Events are episodes with a proposal → planning → action plan → in action → completed → retrospective → improved lifecycle. Approval decisions record the administrator and time; approved proposal/planning edits require reapproval. Episode work uses a dedicated detail workspace with brief, linear task timeline, linked work, reminders and retrospective tabs. Checklists show owners, workstreams and dates, with fixed-date overrides for event-relative deadlines. Unsaved changes are explicit. Existing content, campaign and outreach workflows remain responsible for delivery and consent; creating a linked campaign only creates a draft. Event reminders appear in the workspace until completion, with optional independent calendar export. Recap learnings can seed the next episode. The Episode 02 starting plan is based on the supplied campaign reference and keeps unconfirmed logistics and prospective sponsors unconfirmed.

Content rows begin with a single pencil icon and an “Edit and more actions” tooltip. Its menu contains Edit content, Feature/Unfeature, Archive/Restore and Delete; no separate trailing action controls.

Content Board/List/Schedule views use the shared rounded `ViewSwitch`: three icon-only buttons bundled in a subtle pill, with tooltips, a visible selected state and arrow-key navigation. Preserve the existing view data and behavior.

All admin workspace inputs, textareas and select triggers use the same semantic subtle-grey filled surface and transparent resting border as search. Retain visible focus outlines, error borders, persistent labels and muted placeholders; autofill must retain the filled surface. These colours follow light/dark and Brand/Minimal themes.

Events and Content collection toolbars share the same search + ghost Filters pattern. Event visibility (Active/Archived/All) lives in the Filters popover, with a badge for a non-default selection and a Clear filters action. Episode templates remain available alongside these tools.

Content collection tabs and the view selector share one row. Use a compact dropdown at the right for Board/List/Schedule; hide it on Templates and preserve the chosen view when returning. On narrow screens the tabs scroll within their own region.

Episode cards place a round pencil action menu immediately to the right of Open episode. It includes Edit episode, Feature/Unfeature, Archive/Restore and confirmed Delete. Featured episodes show a named star indicator; the flag persists with the episode's versioned metadata.

Workspace secondary and icon actions are text/icon-only at rest with transparent borders; a subtle grey surface appears on hover. Destructive actions retain their danger-coloured text. Primary actions retain their filled emphasis, selected controls retain their state indicators, and all buttons keep visible keyboard focus.

Every episode card includes a cover thumbnail in the same 3:1 frame. When no cover is specified, display a semantic grey placeholder with an image icon and “Event cover” label.

Episode collection cards are compact: a shallow 4:1 cover (up to 120px), stage, optional episode number, title, short date and open/edit actions. Keep descriptions, venue, owner and checklist counts inside the episode; omit empty episode labels and placeholder cover text.

Episode cards use a 4:3 overall frame and a full-card keyboard-accessible open target, with an independent edit menu. Hover/focus and press tint the card using a darkened average of its cover, blended with the theme surface to preserve readability. Cover sampling is cached and neutral fallback applies when images are missing or do not allow cross-origin sampling. Minimal stays monochrome.

Episode cards have no visible resting border. Pointer hover scales them to 1.025, press to 0.99, and exit smoothly returns to normal using the shared motion tokens. Reduced-motion preferences disable scaling; keyboard focus stays visible.

Content collection tabs sit one control-space above the collection, without a full-width separator. The active-tab underline remains visible.

Episode lifecycle progress uses seven slim, equal-width segments with muted stage labels and an emphasized current stage. Each line smoothly doubles in thickness when its stage is hovered, without moving the layout. It fits the available width without scrolling, and exposes the current stage through accessible progress semantics. Reduced motion disables the transition.

Episode stage labels are single words and use shared buttons spanning both label and line. Clicking requests a confirmed, audited stage change; backward moves are allowed and forward moves validate every crossed approval gate. Unsaved and archived episodes must be saved or restored first.

Episode stages use numbered text buttons with no progress bars. The current stage has a subtle filled background; other stages use the shared text-button hover and focus states. Buttons wrap on narrow screens and retain confirmed stage changes and approval checks.

Event lifecycle colours: purple Proposal, blue Planning, amber Actions, orange Live, green Completed, teal Review and rose Improvement. Shared labels stay readable on subtle tints; Minimal remains monochrome. Action statuses use neutral To-do, amber Doing and green Done. Status is editable in action details and stays in sync with completion checkboxes.

Visual editor layout is bounded to the viewport with independently scrolling layers and properties; scrollbars are hidden while scrolling stays available. Below 960px of editor width, shared text buttons open the existing drawer for Layers, Presets or Properties. The canvas retains fit-to-frame proportions, explicit zoom scrolls within the canvas region, and drawers preserve keyboard focus and Escape dismissal. Tools never expand into a full-width properties grid beneath the canvas.

Format switches calculate fit from the current canvas dimensions and measured viewport in the same render, reset zoom to Fit, and show a neutral placeholder until the new layout has painted. The canvas then fades in using the shared motion token; reduced motion skips the fade. Logo proportions remain fixed across aspect ratios.

Colour fields use the shared `ColorField` (`label`, `value`, `onValueChange`): a compact circular picker beside a hex input. Three- or six-digit hex values commit on blur or Enter; invalid values show a correction hint, and Escape restores the saved value. Touch targets expand on coarse pointers.

Sliders have no surrounding field border, grey input box or shadow. Keep the native track and thumb, with a neutral accent and visible keyboard focus.

Transient status messages use shared `Toast` (`message`, `onDismiss`, optional `duration`, default 6000ms). ThemeProvider hosts a fixed bottom-right stack outside page flow. Notifications pause on hover/focus and offer dismissal; persistent validation errors remain beside the relevant workflow.

Visual layer rows use a grey selection fill without outlines on click or hover. Keyboard focus uses a subtle fill and underline instead of a surrounding ring.

Dropdown and context-menu items use a subtle grey hover/focus fill without inset borders or rings. Keyboard focus adds an underline. Open select triggers use the same subtle fill instead of a coloured outline.

Event cover thumbnails and empty placeholders always use a 4:3 frame at every collection width. Card height follows the thumbnail and caption; images crop with object-fit cover rather than stretching.

Episode stage buttons stay on one line at every width, with horizontal scrolling and a hidden scrollbar. Buttons keep their natural width and remain keyboard accessible.

Access management lives at /admin/access using the current workspace shell and saved appearance preferences. Requests and Administrators use shared tabs, search, avatars, badges and tables. Approve/decline retains authenticated server actions, self-access protection and audit logging; outcomes use temporary notifications. Empty and search states are explicit, and wide data tables scroll inside the page.

Episode stage selection uses one compact single-select dropdown showing the current numbered stage and its colour. Changing the selection retains the existing confirmation and approval checks.

Access rows begin with a compact edit action. Access levels are Admin, Pending and No access; removed accounts remain available for restoration. Invite admin accepts a new email and sends a Supabase invitation with password setup. Own-account and allowlisted administrator changes are disabled and enforced on the server. Rights rely on server-managed metadata, not editable profile fields; role changes never bypass email verification.

The breadcrumb begins with Back and Forward icon buttons, with tooltips and disabled end states. They navigate workspace page history, including Access management, preserve the unsaved-event guard, and clear forward history after a new destination is chosen.

The episode stage dropdown and next-action panel share a single row. Stage options use a period after the number, such as “2. Planning”; next-action content wraps within its panel on narrow screens.

The next episode action is a single text button aligned with the stage dropdown. Readiness details and approval requirements appear in its hover/focus tooltip; unavailable actions remain focusable so the reason is accessible.

Shared tooltips render through a portal at the theme root, above menus, dialogs and notifications. They avoid viewport edges and wrap long text so workspace panels cannot clip them.

Content editor tab forms are centred within the available workspace width, capped at 850px. Field labels and copy remain left-aligned; the visual editor continues to use the full available width.

### Poster typography and existing photography
Episode 02 visual presets use existing Physical I/O photographs, editable Manrope headlines, an episode label and a supporting line. Presets are composed for the selected canvas dimensions. Format resizing scales type and tracking with text-box height, avoiding repeated min-axis shrinkage on round trips. Only the exact generated Episode 02 starter is upgraded automatically; its previous layout remains available through Undo. Custom artwork is preserved.

### Episode 02 reference composition
Poster presets now follow the supplied reference: official mark top left, brand name top right, centred supporting question in the upper fifth, large left-aligned three-line headline near the centre, and centred episode label near the bottom. Keep photography full bleed and darkened for white typography.

### Independent visual layouts per format
Each story retains a separate saved composition for every named format. Save acts only on the selected format and names it explicitly. First use of a format seeds an editable copy; subsequent switches restore its own draft, including Undo/Redo history. Local recovery preserves all format drafts. The existing version-checked, locked save merges only the submitted format into the stored JSON and retains legacy single-format documents. Custom represents one independently sized layout.

### Visual layer effects
Effects includes Rough edges for text and Blur for every layer, both adjustable from 0–30 and off by default. Rough edges uses deterministic SVG turbulence/displacement; blur softens the result before any shadow. Preview and PNG export share the same SVG filter chain, with room for expanded edges. Effect values persist in each format’s document and support Undo; older documents default to zero.

### Projector colour separation
Effects includes RGB shift (0–30) per layer. It offsets isolated red and blue channels around green and recombines them additively, following roughness/blur and preceding shadows. Zero bypasses the effect. Existing documents default to zero; per-format saves, Undo and PNG export preserve the value.

### Background grunge
Canvas & image overlay provides Background grain (0–100%) and Grain size (1–8). Deterministic monochrome turbulence textures the canvas background and image layers beneath text. Defaults preserve older artwork; settings save independently per format and carry through PNG export and Undo.

### Default text treatment
New text layers—including newly generated poster text—start with RGB shift 1, Rough edges 4 and Blur 1.5, matching the supplied reference. Existing saved layers retain their values. Images, logos and shapes remain clean by default, and explicit text-effect overrides are preserved.

### Visual inspector disclosure
Layer properties, Typography, Appearance, Effects, Canvas, Background grain and Image overlay each fold independently using the shared Disclosure component. Sections initially open and retain control values while collapsed; the same inspector is used in the narrow-screen drawer.

### Content owners
Owner is a shared Select populated from current administrators through the authenticated content endpoint. Mark the signed-in administrator with “(you)”, offer Unassigned, and retain existing owner names even when they are no longer in the directory. Ownership remains descriptive assignment and does not grant account permissions.

### User details
The owl menu links to /admin/profile in the current workspace shell. Show the signed-in administrator’s name, read-only sign-in email and role. Name edits use a validated, session-scoped Supabase update without accepting a user ID or changing permissions. Save errors remain actionable and success uses the shared toast.

### Personal headshots
Replace the shared owl account image with each signed-in person’s headshot or initials. User details supports PNG/JPEG/WebP uploads up to 750 KB and restoring the name placeholder. Uploads use authenticated user-scoped storage paths; profile updates change only the current user’s headshot metadata. Header identity refreshes after profile updates.
