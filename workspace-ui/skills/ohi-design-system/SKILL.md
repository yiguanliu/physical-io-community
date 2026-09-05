---
name: ohi-design-system
description: Build and review new Physical I/O and ohi UI features using the established workspace component library, brand tokens, theme variants, contextual disclosure, and motion rules. Apply to new pages, components, forms, panels, navigation, and visual changes in these projects, or when explicitly adopting this design system.
---

# ohi design-system enforcement

All new UI in a project adopting this skill MUST use the ohi design system. Treat the current workspace as the visual and interaction reference. Extend the shared library when a necessary pattern is missing; do not create competing page-local controls. The user's latest explicit design decisions override this skill. Do not require extra approval for ordinary design-system implementation.

## Find the maintained source

Resolve the library in this order:

1. The current repository's `workspace-ui/`, or its root when it contains `src/theme.ts`, `src/styles.css`, and `app/page.tsx`.
2. The reference checkout: `/Users/yiguanliu/Documents/Playground/physical-io-website/workspace-ui`.
3. An installed `@physical-io/workspace-ui` package and its accompanying docs.

Read these before implementing relevant UI:

- `src/theme.ts` — canonical brand defaults, presets, and accessible action colors.
- `src/index.tsx` — actual component contracts; never assume an API.
- `src/styles.css` — reusable styling, focus, motion, and overlay behavior.
- `design.md` — principles; later decisions supersede earlier historical values.
- `app/page.tsx` and the relevant rules in `app/gallery.css` — the worked example and latest workspace composition.
- `README.md` — building and consuming the package.

The running example is `http://localhost:3100/`. Verify it is this workspace before using it as evidence. Inspect People, Projects, Components, Principles, and Appearance as relevant. If unavailable, use the source or start the documented preview within the authorized environment. A stale tab is not evidence of current implementation: check computed styles and loaded font after a refresh, without discarding user edits unnecessarily.

If the library is missing, search the provided workspace/package locations before asking for its location. Do not silently recreate an approximation and claim conformance.

## Required implementation decisions

- **Reuse first.** Import shared `Button`, `IconButton`, `Field`, `Select`, `SearchField`, `Switch`, `Tabs`, `Popover`, `ContextMenu`, `Dialog`, `Badge`, `Card`, and other existing primitives. Use native elements inside library primitives as appropriate. Do not introduce another UI library or duplicate button/form implementations in feature code.
- **Shared extensions.** Add missing reusable patterns to the library, document their API, and show their meaningful states in the component example. Feature-specific content stays in the consuming app. Preserve advanced existing behavior such as column resizing, selection, server validation and authorization.
- **Theme ownership.** Mount `ThemeProvider` at the UI boundary and import the shared stylesheet once. Use semantic `--ui-*` tokens. Color literals, unrelated font stacks, bespoke spacing scales, or per-page motion values belong in reviewed theme definitions, not feature components. Layout-specific CSS is allowed when it follows existing spacing and hierarchy.
- **Brand.** Use locally bundled **Manrope** and paprika **#ee4b1a** from `physicalIOBrand`. Use the exact official Physical I/O SVG from `app/LogoMark.tsx`; do not redraw it. Keep the ohi workspace identity unless the user changes it.
- **Primary actions.** Filled primary buttons use white text/icons via `--ui-action`, `--ui-action-hover`, and `--ui-on-action`. Derive a sufficiently dark action shade; never put dark text on the filled primary action or use inaccessible white text on an arbitrary raw accent.
- **Theme compatibility.** Support Brand and Minimal black-and-white palettes, light and dark modes, and font/density/hierarchy choices. Minimal status badges remain monochrome with text/shape meaning; do not apply grayscale filters to the whole app. Respect a user's selected appearance.
- **Compact, not cramped.** Follow the current example's small typography with a 12px supporting-text floor, 13px base, and quiet headings. Retain content breathing room: 24px section spacing, 12px control gaps, 16px card insets, and roughly 48px compact data rows. Reuse current tokens rather than copying these values into new selectors. Avoid compressing multi-line content to fit an arbitrary height.
- **Quiet tools.** Collection search and Filters use borderless resting styles, subtle hover/expanded feedback, and a visible keyboard-focus state. Use shared ghost buttons; do not remove focus outlines globally.
- **Square icon buttons.** Explicit equal width/height, non-shrinking flex behavior, and rounded corners. They must not stretch beside multi-line titles. Current compact desktop target is 32×32 with 8px radius; mobile controls retain larger targets.
- **Forms and settings.** Use the custom Radix-based `Select` with `onValueChange`, not a visible browser-default select. Persistent labels and associated help/error text are required. Settings fields fill their container; aligned toggle rows place the toggle at the far edge. Overlays must inherit the current theme.

## Compose pages with contextual disclosure

Use `WorkspaceShell → PageHeader → optional Tabs → Toolbar → DataTable/cards`. Keep sidebar and slim topbar stable. Do not invent a fresh shell per feature. Public-facing features use shared brand tokens and suitable primitives, not an imposed admin navigation layout.

- Inline controls for frequent simple changes.
- Popovers for filters and lightweight choices.
- Context menus for secondary actions; the team surface shows just logo and name, with details/actions behind the logo.
- Detail drawers for inspecting/editing a record while preserving its collection context.
- Dialogs for focused creation/confirmation; do not stack modals.
- Dedicated pages for extended multi-step work.
- Project cards use cover images or labeled image placeholders, not large folder icons or decorative numbering.

Do not copy demo names, fabricated metrics, simulated saves, or in-memory business behavior into production. Routing, persistence, authorization, consent and data validation remain host responsibilities.

## Motion and loading

For local workspace views, reuse `useWorkspaceNavigation` and `PageTransition`: 140ms outgoing handoff/loading line, then 220ms fade with a 5px reveal. Keep shell navigation outside the transition. New navigation replaces pending work; clean up timers, mark outgoing content inert/busy, and announce the destination. Respect reduced motion with an immediate switch.

For real route/data loading, drive pending state from the host router or request lifecycle. Do not impose artificial minimum waits or show invented progress percentages. Use skeletons for meaningful longer waits. Keep transition timing in shared tokens. Include hover, focus, pressed, disabled, loading, empty, error and success states wherever applicable.

## Completion gate

Do not report a new UI feature complete until:

1. Its controls reuse the library or a documented shared extension; no competing theme/control implementation was introduced.
2. The implemented flow works, including relevant empty, pending, error and success paths. Visible controls must have meaningful behavior.
3. Relevant type/build checks pass. For library changes run its `typecheck` and `build`; for gallery changes run `build:gallery`; run `test` for theme/contrast changes. Use the actual consumer's checks when integrating elsewhere.
4. Visually inspect the changed flow in the current build: representative desktop and narrow viewport, Brand and Minimal where affected, and dark mode. Exercise keyboard focus, Escape/focus return, full-width settings, and square close buttons when relevant. Check console output. Test reduced-motion behavior for new motion where tooling permits; otherwise disclose that verification limit.
5. Check contrast for changed color pairs: normal text 4.5:1; necessary control indicators/focus 3:1. Keep status meaning in text, not color alone. Confirm no page-level horizontal overflow; scrollable data regions are intentional.
6. Update the maintained design rules/component example when a new reusable pattern is introduced. Report concrete verification and any unverified limits; do not claim certification or production integration from a demo.

An unavailable browser or external dependency does not justify inventing a pass. Complete available checks and state the specific remaining limit. Do not expand into unrelated migrations, deployment or sending messages to satisfy this gate.
