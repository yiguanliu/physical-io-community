# Physical I/O — Website (v0.2)

Landing site for **Physical I/O**, London's community for Physical AI, Robotics & Spatial Intelligence, plus a private admin workspace for members, email campaigns and sponsor outreach.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Better Auth** — invitation-only administrator login
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
| Outreach | Sponsor pipeline, notes, status changes, 1:1 email |
| Events | Event records used by campaign targeting |
| Access | Approve or decline administrator requests |

Emails honour newsletter/event consent. Members with `consent_unknown`, bounces, complaints or unsubscribes are skipped. Without `RESEND_API_KEY`, sends are recorded locally so you can still practise the workflow.

### Environment

Copy `.env.example` and set:

- `BETTER_AUTH_SECRET` — required in production
- `BETTER_AUTH_URL` — public site URL
- `BETTER_AUTH_API_KEY` — optional Better Auth Infrastructure key from the [dashboard](https://better-auth.com/dashboard)
- `ADMIN_ALLOWLIST` — comma-separated extra emails granted admin immediately on signup (`soul@physical-io.com` is always included). Everyone else can request access.
- `RESEND_API_KEY` / `RESEND_FROM` / `RESEND_WEBHOOK_SECRET` — live sending
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — persistent database on Vercel

CSV import accepts the Google Form export headers (`Full name`, `Email address`, `City`, and so on).

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
