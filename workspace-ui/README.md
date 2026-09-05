# ohi · Workspace UI

A separate React component library and Next.js playground, inside this repository at `workspace-ui/`. It has its own package manifest, scripts, build output and design documentation. It can be copied to a separate repository and installed independently; no host app aliases or services are required.

## Code directory

Current local path: `/Users/yiguanliu/Documents/Playground/physical-io-website/workspace-ui`

- `app/page.tsx` — workspace demo pages and interactions.
- `app/gallery.css` — workspace layout and spacing.
- `src/index.tsx` — reusable UI components.
- `src/styles.css` — shared styles and design tokens.
- `src/theme.ts` — brand colors, fonts, themes and contrast helpers.
- `design.md` — design principles.
- `skills/ohi-design-system/SKILL.md` — required skill for new UI features.

Edit `src/` for changes shared across features; use `app/` as the working workspace example.

## Run

From this folder:

```sh
npm install
npm run dev
```

Open http://localhost:3100. In the current checkout the existing parent dependencies can also run it with `npm --prefix workspace-ui run dev`. Demo records and theme changes reset on reload. No emails, API mutations or persistence are involved.

```sh
npm run typecheck
npm test
npm run build
npm run build:gallery
```

`build` emits ESM, declarations and styles into `dist/`. `build:gallery` builds the standalone Next.js app. The package is private to prevent accidental registry publication; local packing and installation remain possible.

## Consume

Build and pack this folder (`npm run build && npm pack`), then install the generated tarball in the consuming project. Import CSS once in the app layout:

```tsx
import '@physical-io/workspace-ui/styles.css';
import { ThemeProvider, defaultTheme, Button, PageHeader } from '@physical-io/workspace-ui';

export function MembersPage() {
  return (
    <ThemeProvider theme={{ ...defaultTheme, accent: '#b63c1c' }}>
      <PageHeader title="Members" description="Manage your community." />
      <Button variant="primary" onClick={() => console.log('open creation flow')}>
        Add member
      </Button>
    </ThemeProvider>
  );
}
```

The consuming interactive wrapper must be a client component in Next.js. Keep server authorization and business rules in the host application. Supply a controlled Theme object; apply a custom font through `--ui-font` on `.wui` and load that font in the host.

## Exports

| Family | Components |
| --- | --- |
| Foundations | ThemeProvider, Button, IconButton, Badge, Avatar |
| Forms | Field, Select, SearchField, Switch |
| Context | Tabs, Popover, Dialog (`dialog` or `drawer`), Tooltip |
| Layout | WorkspaceShell, NavItem, PageHeader, Toolbar, Card |
| Data and feedback | DataTable, EmptyState, Alert, Skeleton |

Native props and refs pass through button/input wrappers. Select uses a custom Radix dropdown with `value`, `defaultValue`, `onValueChange`, `name`, `required`, and `disabled`; options may also be disabled. Use non-empty option values, and `placeholder` for the unselected state. Field associates labels and help/error text. DataTable accepts typed columns, row keys and a caption; filtering/sorting/selection are host-controlled. Tabs accept controlled value and item content. Dialog accepts controlled open state and restores focus to the opener. Use only one modal at a time. All overlay styling inherits the scoped theme.

## Documents

- [Design principles and component rules](design.md)
- [Source review and migration plan](docs/design-review.md)
- [Validation record](docs/validation.md)

Known scope: no production admin integration; no built-in virtualized table, column resizing, routing, drag-and-drop, persistence, or authentication. These remain host responsibilities. Gallery project cards are illustrative; People is the complete local create/edit example. Full screen-reader conformance testing is still required before adoption.

## Physical I/O brand defaults

`defaultTheme` now uses `accent: '#ee4b1a'` (paprika) and `font: 'brand'` (Manrope). Import `physicalIOBrand` for the canonical accent, font stack and spacing values. `styles.css` bundles the variable font locally; package builds include `dist/fonts` and its SIL Open Font License. No Google Fonts runtime request is needed.

Semantic CSS tokens include `--ui-brand-accent`, `--ui-brand-font`, `--ui-space-control`, `--ui-space-section`, `--ui-space-page` and `--ui-space-card`. Appearance still offers alternate colors/fonts. The accent foreground is computed for contrast; paprika uses dark text. Custom presets must retain contrast checks.

## Minimal black & white preset

Choose **Appearance → Theme → Minimal · Black & white**, or pass the exported `minimalTheme` to `ThemeProvider`. The optional `palette: 'minimal'` setting uses neutral surfaces, focus, controls and status badges in both light and dark modes. Primary buttons keep white text on black. Status labels and distinct dot shapes retain meaning without color. Typeface, density and hierarchy remain independent. Choose Physical I/O · Brand to restore the brand palette.

## Page transitions

`useWorkspaceNavigation(initialPage)` returns `{ page, pendingPage, navigate }`. Wrap view content in `<PageTransition page={page} pendingPage={pendingPage}>…</PageTransition>` and route local navigation through `navigate`. It handles cancellation, unmount cleanup and reduced motion; PageTransition provides busy state, an announced destination, a short loading line and content entry animation. Keep shell navigation outside the wrapper. The local handoff lasts 140ms with a 220ms reveal; real network pending states should be driven by the host router rather than a timer.

## Multiline fields

`TextArea` shares the `Field` label, hint, error and generated-ID contract and accepts native textarea props (including `rows`, `required`, `value`, and `onChange`). Use it for messages and longer notes; it inherits typography, theme, and focus styles. The Components example includes an editable Notes field.
