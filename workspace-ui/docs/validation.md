# Validation record

5 September 2026

## Automated checks

- `npm run typecheck`: passed.
- `npm run build`: passed; emits ESM, declarations and stylesheet. Dynamic import of the built entry succeeded (25 runtime exports: 22 components and 3 theme helpers).
- `npm run build:gallery`: passed; production homepage statically rendered, approximately 151 kB first-load JS in this environment.
- `npm test`: 3 passed. Tests validate foreground selection across 4,096 sampled RGB accents, invalid accent fallback, and text/status/control/focus contrast in both built-in modes.

Dependencies for validation were resolved from the existing parent installation (Next.js 15.5.20). A clean installation outside this checkout was not performed. The package declares all required dependencies and has no application aliases.

## Browser checks

Browser verification used the available computer-use browser tooling because agent-browser was not installed.

- Loaded a clean production build at localhost:3100 with no console warnings/errors.
- Search narrowed the table to Olivia; status filter narrowed it to the two invited members.
- Opening Olivia's drawer, changing status and saving updated the table and returned focus to the opener.
- Creating a demo person increased the count from 7 to 8 and showed a success message.
- Table and board views rendered; filters remain available in both views.
- Dark mode, humanist font and compact density updated the scoped theme.
- Components navigation rendered the gallery. Escape dismissed creation and returned focus to Create record after the exit transition.
- Inspected desktop light/dark screenshots and mobile layout at 390×844. Document width equaled viewport width (390px); table data is independently scrollable.
- Browser viewport restored to its original size. Demo reset to the default theme and People view for handoff.

## Remaining adoption checks

The reduced-motion CSS is implemented but OS preference emulation was not exercised in this run. Full screen-reader testing, 200% browser zoom, forced-colors mode, exhaustive keyboard coverage and production data edge cases remain integration checks. This is not a certification of WCAG conformance. The existing authenticated admin was reviewed from source, not through its live UI.

## Custom dropdown update

Replaced visible native selects with one themed Radix Select implementation. Typecheck, library build and production gallery build passed. Browser checks confirmed pointer selection, Space/arrow/Enter keyboard selection, Escape dismissal, and working options inside both the detail dialog and filter popover. Inspected light/dark menu styling; console contained no warnings or errors. Select consumers now use `onValueChange` instead of native `onChange`.

## ohi layout update

Renamed visible branding and page metadata from Forma to ohi. Updated the example shell to compact navigation, summary cards and a full-width records area; moved theme controls into the Appearance drawer. Typecheck and production build passed. Inspected desktop and 390px mobile layouts (document width 390px, no page-level overflow). Verified custom font selection inside the Appearance drawer, with no console errors or warnings. Restored the default viewport and reloaded the preview for handoff.

## Compact workspace density

Tightened the compact workspace preset: 172px sidebar, 42px topbar, 18px page padding, 32px desktop controls and 40px table rows. Reduced summary, tab and section spacing while retaining readable labels and mobile touch sizes. Production build passed. Browser inspection confirmed 40px rows, 172px sidebar, no page-level horizontal overflow, and all seven demo rows visible in the current desktop viewport. Comfortable density remains available through Appearance.


## Brand defaults and breathing room

Library build, production gallery build and all 3 contrast tests passed after adding the locally bundled Manrope variable font and paprika default. Browser inspection confirmed font loading, the computed brand font family and #ee4b1a accent. Content now has 24px section spacing and roughly 48px rows (observed 48.59px with font layout). Font licensing is bundled in src/fonts/OFL.txt and dist/fonts/OFL.txt.

## Workspace page transitions

Library and production gallery builds passed. Browser navigation reached Projects and then Principles after sequential page selections; computed entry animation was ui-page-enter at 220ms. No browser console warnings/errors. Pending handoff lasts 140ms and was too short to capture through the browser tool's post-click round trip; inert/busy setup, timer cancellation and reduced-motion handling were reviewed in source. OS reduced-motion emulation was not exercised in this check.
