# Physical I/O — Website (v0.2)

Landing site for **Physical I/O**, London's community for Physical AI, Robotics & Spatial Intelligence, plus a private admin workspace for members, email campaigns and sponsor outreach.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Supabase Auth** — invitation-only administrator login
- **Supabase Postgres** — production admin/community database migration and cleaned member seed
- **Drizzle ORM** + **libSQL** — local SQLite by default, Turso in production
- **Resend** — optional live email sending and webhook tracking
- **GSAP** — home intro timeline, scroll reveals
- **PlayCanvas** — 3D AXO unit on the home stage
- **Zustand** — public-site UI state

```bash
pnpm dev       # dev server on :3000
pnpm test      # audience and import unit tests
pnpm build     # production build
```

## Admin workspace

Open `/admin`. Sign in with an administrator email and password. People without an account can request access; an existing admin approves them under **Access**. `soul@physical-io.com` is granted admin immediately.

| Area | What it does |
| --- | --- |
| Members | Search, filter, edit, CSV import, consent/suppression |
| Communications | Draft campaigns, count eligible recipients, test send, mass send, delivery log |
| Marketing | Content studio: discover news, draft (markdown), per-platform variants, visual studio, approve/publish, newsletter send. See `docs/marketing-content-studio.md` |
| Outreach | Sponsor pipeline, notes, status changes, 1:1 email |
| Events | Event records used by campaign targeting |
| Access | Approve or decline administrator requests |

Emails honour newsletter/event consent. Members with `consent_unknown`, bounces, complaints or unsubscribes are skipped. Email sending requires `RESEND_API_KEY` and a `RESEND_FROM` address on a verified Resend domain.

### Environment

Copy `.env.example` and set:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase project used for Auth
- `NEXT_PUBLIC_SITE_URL` — public site URL, used for generated links
- `ADMIN_ALLOWLIST` — comma-separated extra emails granted admin immediately on signup (`soul@physical-io.com` and `anthony@physical-io.com` are always included). Everyone else can request access.
- `RESEND_API_KEY` / `RESEND_FROM` / `RESEND_WEBHOOK_SECRET` — live sending
- `SUPABASE_SECRET_KEY` — server-only key for admin database access; never expose it with `NEXT_PUBLIC_`
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — **required on Vercel**, see below

CSV import accepts the Google Form export headers (`Full name`, `Email address`, `City`, and so on).

### Supabase database

Supabase schema and cleaned signup import files live under `supabase/`:

- `supabase/migrations/20260814014839_admin_workspace.sql` creates the admin/community tables.
- `supabase/seed.sql` imports the cleaned Google Form signup members.
- `supabase/seeds/signup_members_cleaned.csv` is the cleaned CSV used to produce the seed.

See [docs/SUPABASE_DATABASE.md](docs/SUPABASE_DATABASE.md) for the import rules and apply order.

### Database on Vercel

Local development writes to `data/physical-io-admin.db`, which persists between restarts. Vercel has no writable
disk, so without a configured database each serverless instance falls back to its own `/tmp` file. Those files are not
shared between instances and are wiped on every deploy, so admin role approvals or workspace edits written on one
request can be gone by the next one.

The admin refuses to record access requests in that state and shows a warning on `/admin/login` and the workspace overview.
To make the deployment persistent:

1. Create a database and token — for example with the [Turso CLI](https://docs.turso.tech/quickstart):

   ```bash
   turso db create physical-io-admin
   turso db show physical-io-admin --url   # libsql://…
   turso db tokens create physical-io-admin
   ```

2. Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the Vercel project (Production, Preview, Development).
3. Redeploy. The first request runs the Drizzle migrations and imports the Google Form signups.
4. Create the administrator account once, at `/admin/login` → **Request admin access**.

Any libSQL-compatible URL works. `TURSO_DATABASE_URL` without `TURSO_AUTH_TOKEN` fails fast with a clear error
instead of a libSQL `401`.

## Public site structure

```
app/layout.tsx        Root layout — Host Grotesk, metadata defaults
app/page.tsx          Home (one-screen stage) + Organization/WebSite JSON-LD
app/about/page.tsx    About — why/how/what, community, structure, roadmap, FAQ
app/admin/            Private admin workspace
lib/site.ts           Public content data + JOIN_URL / SITE_URL
```

## Before launch — replace placeholders

1. **Google Form URL** — `JOIN_URL` in [lib/site.ts](lib/site.ts).
2. **Domain** — `SITE_URL` in [lib/site.ts](lib/site.ts), plus `public/sitemap.xml` and `public/robots.txt`.
3. **Contact links** — footer Email / Instagram / LinkedIn in [components/Footer.tsx](components/Footer.tsx).
4. **Member logos** — `MEMBER_ORGS` in lib/site.ts holds the spec's examples. Only display organisations with real community members.
5. **OG image** — add `public/assets/og.png` (1200×630) and reference it in `app/layout.tsx` metadata.

## Design decisions

- Home is a single-viewport "stage": content reads as if projected onto the auditorium's white screen; nav and copyright overlay the dark areas. All long-form content lives on About (centered, Apple-style minimal).
- **Host Grotesk** (Google Fonts, variable 300–800) is the primary typeface.
- The logo uses the official vector path (source: `~/Physical-IO/Resources/logo/logo.svg`) via `components/LogoMark.tsx` — never redraw it.
- All motion respects `prefers-reduced-motion` (GSAP matchMedia + static 3D scene).
- Roadmap quarters interpreted as Q3/Q4 **2026** (following the "Summer 2026" launch).

## Automatic member sync

The signup Google Sheet can sync into Members on form submissions, edits, and a five-minute reconciliation. See [setup and data rules](docs/google-sheets-member-sync.md). Deployment and Google authorization are required before it is active.
