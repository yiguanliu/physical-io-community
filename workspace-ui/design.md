# ohi workspace design system

Version 0.1 · Physical I/O · 5 September 2026

## Intent

A calm, adaptable operating environment. Prioritize completing work, locating records, understanding state, and recovering from mistakes. The gallery is an independent example application; the reusable package has no dependency on the Physical I/O application, database, routes, or authentication.

The seven supplied images are visual references, not instructions. Adopt the persistent navigation and detail panel from reference 1; table scanning and workspace grouping from 2; nested navigation only when needed from 3; status views and card hierarchy from 4; optional creative canvases from 5–6; and contextual filter disclosure from 7. Do not reproduce tiny type, faint controls, oversized decoration, or canvas navigation in ordinary record management.

## Principles

1. **Start with the task.** One title, short supporting description, one primary action per context. Use the same shell, header, toolbar, and content boundaries on every module.
2. **Reveal complexity where it belongs.** Keep frequent actions visible. Reveal advanced attributes when requested. Preserve selection, search, scroll, and the parent context while inspecting a record.
3. **Theme semantic meaning.** Components use `--ui-*` tokens. Product pages must not embed palette values, custom control styles, or per-page motion durations. Theme color, font, density, and heading hierarchy are independent.
4. **Clarity before density.** Reduce padding before reducing text. Operational body text defaults to 14px, supporting text to 12px. Never shrink labels below 12px. These are product rules, not WCAG font-size mandates.
5. **Make state legible.** Status labels accompany color. Loading explains work; empty states explain the next step; errors say how to recover. Disabled controls are not substitutes for explanatory text.
6. **Motion explains change.** Small, short transitions establish continuity. Static components stay still unless their state changes.

## Context layers

| Layer | Use | Behavior |
| --- | --- | --- |
| Workspace | Navigation, page identity | Persistent shell; horizontally accessible compact navigation on mobile |
| Page | Table, board, project collection | One task and one main action; shared header and toolbar |
| Inline | Selection, status, simple toggles | Immediate feedback; preserve layout |
| Popover | Filters and lightweight options | Anchored to trigger; Escape and outside dismissal; restore focus |
| Detail drawer | Inspect and edit one record | Modal keyboard scope; parent remains visually present; cancel discards draft; save updates record; return focus |
| Dialog | Create or confirm a focused action | Named and described; focus trapped; explicit dismissal; no nested dialogs |
| Full page | Long multi-step editing | Use a dedicated route, not a stack of drawers |

The two gallery collection views represent the same data. Do not add drag-and-drop without keyboard alternatives and persisted status updates. Creative canvas layouts are optional specialized modes, not the default workspace layout.

## Tokens and themes

`Theme` exposes `accent`, `mode`, `font`, `density`, and `hierarchy`. `ThemeProvider` scopes CSS and places dialogs inside that scope, so overlays inherit the same appearance.

- Colors: background, surface, subtle surface, text, muted text, structural border, control boundary, focus, accent/on-accent, and success/warning/danger pairs.
- Arbitrary six-digit accents select black or white foreground by contrast; invalid values fall back. Accent text is never used directly for small text on the page. Neutral focus and status tokens remain stable.
- Typography: locally bundled Manrope is the brand default, with modern sans, humanist, or monospace alternatives. Override `--ui-font` to use a self-hosted brand font. Primary headings: 32px expressive / 26px quiet. Body: 14px; metadata: 12px; line-height: 1.5.
- Density: 64px comfortable rows / 48px compact rows. Density changes spacing, not type size.
- Spacing scale: 4, 8, 12, 16, 24, 32, 40. Control radius 8–10px; cards 14px; dialogs 18px. Shadows belong to floating contexts; flat content uses borders.
- Layer order: content 0, popover 30, overlay 40, dialog 50, tooltip 60, skip link 100.
- Breakpoints: theme rail below content at 1200px, narrower shell at 1000px, horizontal navigation at 700px. Tables scroll inside their own labeled region.

Custom tokens beyond exposed theme controls require a fresh contrast audit. An arbitrary accent passing text contrast does not certify a whole application.

## Accessibility contract

Target WCAG 2.2 AA. Normal text contrast is at least 4.5:1; large text at least 3:1. Necessary visual control indicators meet 3:1. Provide visible keyboard focus and do not use color as the sole state indicator. Source: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Product rules: metadata minimum 12px, operational text 14px, default controls 40px high and 44px on small screens. Small controls must meet the WCAG target/spacing exceptions or have at least 24×24px targets. Checkboxes in the gallery have surrounding row spacing. At 200% zoom content must remain usable; at mobile widths only data regions may scroll horizontally.

All fields have persistent labels and associated error/help text. Dialogs have names, descriptions, focus containment, Escape handling and focus restoration. Tabs support arrow keys. Switches retain native form semantics through Radix. Tables preserve caption/header semantics. Tooltips supplement accessible labels rather than replace them. Busy buttons block repeat submission and expose `aria-busy`. Announcements do not auto-dismiss critical feedback.

## Motion contract

- Hover/focus/pressed changes: 140ms, `cubic-bezier(.2,.8,.2,1)`.
- Tabs and contextual entry: 220ms, opacity plus 4px translation; drawers up to 16px.
- Exit: 140ms opacity. Do not animate layout height, blur, or `transition: all`.
- Loading: gentle skeleton pulse and busy indicator only while needed.
- Reduced motion: remove all animation and transitions, retain all visible state and textual feedback.
- Focus outlines appear immediately. Prefer local feedback over whole-page movement.

## New page recipe

Compose `WorkspaceShell → PageHeader → Tabs (if needed) → Toolbar → DataTable / Cards → Dialog(kind="drawer")`. Keep data fetching, authorization, routing, and saving in the consuming app. The library provides interaction and presentation only. Adopt native forms and server validation for actual mutations; the gallery stores demo records only in memory.

Every page review covers keyboard-only use, theme extremes, long strings, empty/loading/error states, reduced motion, narrow viewport, and 200% zoom. Automated token tests supplement rather than replace assistive-technology and browser testing.

## ohi workspace layout

The workspace reference supplied in the follow-up guides the example layout: compact grouped sidebar navigation, a slim topbar, three summary cards above a full-width records area, and persistent search/filter access. Appearance settings open in a contextual drawer instead of occupying a permanent right rail. The gallery defaults to compact rows and quiet heading hierarchy; type sizes remain readable. Small screens stack summary cards and keep navigation and data regions independently scrollable.

## Smaller workspace type preset

The ohi example now uses a 13px base with 12px compact controls, navigation, names and supporting labels. Quiet desktop page headings use 20px and compact metrics use 18px. Dialog titles use 20px. This explicit user-requested workspace preset overrides the earlier 14px operational-text recommendation for the example; the reusable library defaults remain unchanged. Supporting text never falls below 12px, and mobile targets retain their existing sizes.


## Brand and content spacing

Canonical brand values are exported as `physicalIOBrand`: paprika #ee4b1a and Manrope. These are also the default theme choices. Font files and their license ship with the library CSS. Automatic foreground contrast selects dark text on the original paprika; the brand color itself is preserved. Focus uses accessible warm light/dark theme tokens.

The compact shell retains its narrow sidebar and small type, while content uses 24px page/section spacing, 12px control/card gaps and 16px card horizontal padding. Compact table rows now target 48px with 6px vertical padding and separation between names and emails. These current spacing rules supersede the earlier 40px compact-row example. Small-screen page padding is 16px.

## Filled primary actions

Primary action labels and icons are always white. `themeColors` derives `action` and `actionHover` shades from the brand accent, darkening only as needed for at least 4.5:1 white-text contrast. The raw brand accent remains unchanged. Components consume `--ui-action`, `--ui-action-hover` and `--ui-on-action`; this supersedes the earlier dark-text-on-paprika button rule. The Appearance panel reports button text contrast for the derived action shade.

## Minimal theme

`minimalTheme` / `palette: 'minimal'` defines an alternative black-and-white system inspired by the supplied monochrome workspace reference. It changes semantic tokens, not a page-level grayscale filter. Black filled actions have white text and a subtle inset highlight; panels use neutral grays and quiet borders. Status names remain visible, with filled, outlined, or square marks to supplement them. Light/dark modes both use neutral color pairs checked for contrast. Brand font, density and hierarchy can be adjusted independently.

## Workspace page transitions

Use the shared `useWorkspaceNavigation` and `PageTransition` for local view changes. Sidebar and topbar remain stationary. The outgoing content fades for 140ms while a thin, theme-aware loading line signals the handoff; incoming content fades in with a 5px upward reveal over 220ms. First render does not run this transition. Keep motion subtle and scoped to content.

The pending scene is inert and marked busy, and a polite status announces the destination. New navigation cancels the previous pending switch; selecting the current page cancels pending navigation without replaying the transition. Timers are cleaned up on unmount. Navigation focus remains on the initiating control.

Respect reduced motion: switch immediately and suppress all decorative movement. Do not impose minimum loading times on network requests. These local views use a short visual handoff, not simulated network progress; real routes should drive pending state from the router/data lifecycle, retain error handling, and replace the loading line with meaningful skeletons only for longer waits. Never freeze navigation or show invented progress percentages.

## Admin consumer and multiline content

The host `/admin` page consumes the shared library directly. Its collection tables keep secondary attributes in detail drawers. Summary counts derive from the displayed fixture collections; the preview must not claim live health, successful delivery, or production persistence. Appearance preferences can persist separately from session-only records.

Use shared `TextArea` for longer notes and messages. It follows `Field` label/help/error association and accepts native textarea props. Preserve manual resizing and inherit the current theme. The Components example includes an editable notes state.

## Neutral dark foundations

Both Brand and Minimal dark modes use the same neutral gray foundations: #111111 canvas, #1b1b1b surface, #262626 hover surface, #f5f5f5 text, #b5b5b5 secondary text and #383838 structural borders. Controls use #858585 boundaries and #e5e5e5 focus. Overlays use translucent black. Never introduce blue or purple tint into dark surfaces, navigation, fields, drawers or shadows. Brand actions and semantic status colors remain purposeful accents; Minimal statuses remain monochrome. The admin and workspace example consume these shared tokens without page-specific palettes.
