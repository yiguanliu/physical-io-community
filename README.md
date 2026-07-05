# Physical I/O — Website (v0.2)

Landing site for **Physical I/O**, London's community for Physical AI, Robotics & Spatial Intelligence. Built per `Physical_IO_Website_Specification_v0.1.md`.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**, static export (`output: "export"`)
- **GSAP** — home intro timeline, scroll reveals (ScrollTrigger), FAQ accordion animation
- **PlayCanvas** — 3D AXO unit on the home stage (dark cube, glowing paprika panel, transparent canvas)
- **Zustand** — UI state (`lib/store.ts`: intro/scene readiness, FAQ open index)

```bash
npm run dev     # dev server on :3000
npm run build   # static export → out/
```

Deploy `out/` to Netlify, Vercel, Cloudflare Pages or GitHub Pages.

## Structure

```
app/layout.tsx        Root layout — Host Grotesk, metadata defaults
app/page.tsx          Home (one-screen stage) + Organization/WebSite JSON-LD
app/about/page.tsx    About — why/how/what, community, structure, roadmap, FAQ (+ FAQPage JSON-LD)
app/globals.css       Design system — neutral palette, paprika amber accent (#e8940a), Swiss layout
components/           Nav, Footer, LogoMark (official path), HomeStage (GSAP intro),
                      AxoScene (PlayCanvas), Reveal (ScrollTrigger), Faq (Zustand + GSAP)
lib/site.ts           All content data + JOIN_URL / SITE_URL placeholders
lib/store.ts          Zustand store
public/assets/        logo.svg (official mark), favicon.svg, home_bg.jpg (auditorium photo)
_legacy-static/       The previous plain-HTML version (v0.1), kept for reference — safe to delete
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
