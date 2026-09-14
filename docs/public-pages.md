# Public pages

About, Events and Shop share `components/public/PublicShell.tsx`, the homepage appearance preference and the OHI component library. Content for business tiers, event formats, member benefits and rights lives in `lib/site.ts`. The homepage robot experience and existing join/admin workflows are preserved.

## Available now

- `/about`: community bento, static pixel illustrations, commercial operating layers and membership expectations.
- `/events`: programme formats and a server-only, public-field projection of published future events. When there are no published listings, or the listing service is unavailable, show the existing Luma calendar inline. The preview is lazy-loaded without a referrer, with a privacy disclosure and a direct-calendar link outside the embed.
- `/shop`: assembled OHI interest by email and the supplied public GitHub repository.
- Shared navigation, light/dark appearance, responsive layouts and route metadata.

## Separate milestones

- Member access-code generation, delivery and event validation are not implemented. The current join form does not issue a code; the pages say codes are upcoming.
- The assembled kit has no checkout. Confirm specifications, price, stock, fulfilment and payment handling before opening orders.
- The supplied GitHub URL is the community website repository. Hardware files, bill of materials and build instructions remain a future release.
- Build services and the manufacturing ordering platform are described as in development, not as a working ordering service.

Marketing consent remains optional and separate from membership. No test signup, marketing email or purchase is sent during verification.

## Verification

Production build, TypeScript, shared-library build and contrast tests pass. Public event tests verify the safe field projection, published/future filtering, URL validation and unavailable state. Desktop/mobile, light/dark, navigation, keyboard focus, reduced motion and enlarged layout were checked in the browser; automated accessibility checks reported no violations on the three new pages (decorative arrow contrast requires manual review and uses the tested shared foreground colors).

The existing root test command picks up a Node test file with Vitest. Run the two suites separately until that pre-existing runner mismatch is resolved:

```sh
pnpm test --exclude lib/join/join.test.ts
node --import tsx --test lib/join/join.test.ts
pnpm test:workspace
```

On runtimes whose pnpm automatically tries to reinstall dependencies before scripts, use `pnpm --config.verify-deps-before-run=false` with the already installed dependencies.
# Public title spacing

Public-page titles followed by body paragraphs use a shared minimum 30px gap, including heroes, cards and closing sections on desktop and mobile. The rule is scoped to public content so admin controls and compact workspace layouts remain unchanged.
