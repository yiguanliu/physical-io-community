# AGENTS.md

## Cursor Cloud specific instructions

Physical I/O is a single Next.js 15 (App Router, React 19, TypeScript) marketing site
that is statically exported (`output: "export"` in `next.config.ts`). There is no backend,
database, or external service — everything runs in one Next.js process.

- Package manager is **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`). A stray
  `package-lock.json` also exists; ignore it and use pnpm. Dependencies are installed by
  the startup update script, so you do not normally need to run install yourself.
- `pnpm install` reports `Ignored build scripts: sharp`. This is expected and harmless:
  the site uses `images: { unoptimized: true }` with static export, so `sharp` is never
  needed. Do not add sharp to build allowances just to silence the warning.
- Run the dev server with `pnpm dev` (Next dev on http://localhost:3000). Standard scripts
  live in `package.json` (`dev`, `build`, `start`); `build` runs Next's type-checking + lint
  pass and writes the static export to `out/`.
- Type-check with `pnpm exec tsc --noEmit`. There is no separate `lint` script and no ESLint
  config, so `next build` is the lint/type gate.
- Routes: `/` (home stage — GSAP intro + PlayCanvas 3D), `/about` (long-form + FAQ accordion),
  `/admin` (interactive CRM-style admin UI mockup, `noindex`). The admin page is a pure
  client-side mockup with in-memory data — no persistence.
