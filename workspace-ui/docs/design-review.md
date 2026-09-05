# Existing workspace review

Reviewed 5 September 2026. This is a source-based review of the actual repositories plus visual interpretation of the seven supplied references. The authenticated production workspace was not opened; findings about live behavior require confirmation there.

## Scope and document location

The current repository is `physical-io-website`. It has `components/admin/AdminMockup.tsx`, `app/admin/admin.css`, and a separate outreach UI set. It does not have a root design.md. The requested document was found at `/Users/yiguanliu/Documents/Playground/physical-io-community/design.md`, beside the operational admin implementation. Both sources were inspected. Existing files and unrelated user changes are preserved.

## Prioritized findings

| Priority | Evidence | Problem | Library response |
| --- | --- | --- | --- |
| High | Website `app/admin/admin.css:1`: table headers 9px, cells 10px, badges 9px; `community/app/admin/admin.css:126`: content tags 8px | Dense content becomes difficult to scan and zoom preferences are uneven | 14px defaults, 12px metadata floor; density changes row spacing |
| High | Community `design.md`, Typography: 10pt default with alternate sizes; `admin.css:101–126` retains fixed 8–13px sizes | Preference contract is not consistently inherited | One font/density/hierarchy boundary; eliminate page-local font sizes during migration |
| High | Website `admin.css:1` uses muted #77766f on #f3f2ed, white on #ee4b1a, and many hard-coded white surfaces | Color pairs and theme changes need explicit validation | Semantic pairs with measured contrast and automatic on-accent foreground |
| High | Website `AdminMockup.tsx:259` ComposeModal has dialog ARIA but no focus trap, Escape handler or return-focus implementation | Keyboard users can lose context or interact with background | Radix dialog wrapper with explicit return focus |
| Medium | Community `components/admin/ui.tsx`, `components/ui/*`, `components/outreach/ui/*`; website outreach button versus `.admin-primary` | Multiple UI contracts for variants, heights, tokens and focus behavior | One package with typed variants and shared states |
| Medium | Community `design.md`, Motion: detailed public carousel policy but no admin motion taxonomy | New admin subpages must invent timing and transitions | Explicit 140/220ms state-motion rules and reduced-motion override |
| Medium | Website `.outreach-layout` minimum 600px main plus 350px detail; member table minimum 970px | Dense views need intentional responsive containment | Bounded scrollable data region; overlay detail drawer; small-screen navigation |
| Medium | Community `design.md` describes dense panels but not disclosure hierarchy | Too many visible controls or nested panels can result | Layer-selection rules for inline, popover, drawer, dialog and route |

The community already has useful foundations: a typed reusable table, keyboard-resizable columns, native-form adaptation for select, and scoped display preferences. Preserve these capabilities when integrating; do not replace them wholesale with a smaller demonstration table.

## Review of design.md

Keep: separate public/admin intent, calm operational tone, semantic tables, reduced motion, consent awareness, authorization boundaries, reversible workflows, and clear configuration errors.

Revise: define the component source of truth, semantic token ownership, required states, responsive disclosure patterns, type floors, focus behavior, and explicit admin motion values. Replace the broad “dense” instruction with a spacing-driven density rule. Treat paprika as a selectable brand accent with an accessible foreground, not an unconditional white-text background.

Add: component API examples, a live theme gallery, measurable acceptance checks, and a migration sequence. Architecture and launch details should remain separate from the reusable visual contract. The new `../design.md` is a proposed admin design-system companion, not a silent rewrite of the sibling product document.

## Reference synthesis

1. Task workspace: retain persistent navigation and nearby details; avoid tiny pale text.
2. People CRM: retain clear rows, contextual workspace choice, and compact status labels.
3. Product navigation: retain a simple hierarchy; show nested items only for the active section.
4. Project dashboard: retain reusable cards and status views; avoid metadata overload.
5. Freeform canvas: retain spatial grouping only for creative workflows; offer structured alternatives.
6. Research board: retain rich content previews and contextual tools; do not apply canvas controls to CRM tables.
7. Filter panel: retain searchable/contextual attributes and active counts; enforce contrast, focus and clear-reset behavior.

## Migration sequence

1. Consume the package CSS once at the admin layout boundary; mount ThemeProvider there. Keep public marketing CSS outside it.
2. Map existing preferences to font/density/hierarchy. Keep persistence in the host, with versioned storage and safe fallbacks.
3. Migrate buttons, fields, badges, tabs and overlays first. Remove their duplicate CSS only after checking all call sites.
4. Migrate Members as the first real page: keep server actions, consent rules, authorization, table resizing and selection behavior. Substitute the shared shell/header/toolbar and dialog presentation.
5. Migrate campaigns/events/access, then specialized outreach and content studio. Wrap advanced existing tables rather than losing features.
6. Compare every module across themes and input modes. Delete legacy selectors once all consumers have moved.

The standalone playground demonstrates component patterns; it does not migrate or change production admin routes.
