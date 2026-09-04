# Marketing Content Studio

A new admin area for planning, producing, and publishing viral-leaning marketing
content about Physical AI, spatial intelligence, AI hardware, and AI wearables.

## Outcome

Give admins a single workspace that takes a piece of content through its full
lifecycle — **discover → ideate → draft → visual → per-platform adapt → approve →
publish** — with the content record as the durable source of truth. Supabase
stays the system of record; every stage transition, media asset, referenced
source, and platform variant is stored against one content item.

The workspace mirrors an editorial calendar tool (Notion/Airtable + a visual
editor like Hypebeast's post format). Three views over the same records:
**Kanban** (by stage), **Calendar** (by scheduled/publish date), **List**
(dense, filterable).

## Where it lives

- Nav entry `Marketing` → `/admin/marketing` (icon: `layers` or `sparkles`),
  inserted after `Communications`.
- Follows the existing admin patterns exactly:
  - Pages under `app/admin/(app)/marketing/…` (server components).
  - Data access in `lib/admin/content-studio.ts` via `getSupabaseAdminClient()`
    (same shape as `lib/admin/store.ts`).
  - Mutations as server actions in `app/admin/actions.ts` (or a new
    `content-actions.ts`), guarded by `requireAdmin()`.
  - AI via `@ai-sdk/openai` + `ai` `generateText`, always with a graceful local
    fallback when `OPENAI_API_KEY` is unset (matches `lib/outreach/drafting.ts`).
  - New Supabase migration under `supabase/migrations/` + mirror the tables in
    `lib/db/schema.ts` for reference/typing.

## Lifecycle / stages

```
idea → drafting → visual → review → approved → scheduled → published (+ archived)
```

Stored as `content_items.status`. Every transition writes to `audit_log` and to a
per-item `content_events` timeline so the item carries its own lifecycle record.

Stage owners (informal, via `assigned_to`): a **visual designer** builds
templates/visuals; a **content editor** drives copy and picks a template at the
draft→visual handoff; any admin can approve and publish.

## Data model (Supabase Postgres)

New tables (snake_case columns, `text` ids via `createId()`, iso timestamps —
consistent with `campaigns`/`members`):

**`content_items`** — the source of truth for one story.
- `id`, `title`, `slug`
- `status` (stage above), `category_tags` (jsonb array), `virality_score` (int, optional AI estimate)
- `summary` (short hook), `body_markdown` (the confirmed master draft)
- `source_kind` (`web` | `manual` | `ai`), `source_url`, `source_title`, `source_snippet` (for third-party/URL provenance)
- `assigned_to` (user id), `created_by_user_id`, `created_by_name`
- `scheduled_at`, `published_at`
- `created_at`, `updated_at`

**`content_events`** — lifecycle timeline (like `lead_activities`).
- `id`, `content_item_id` (fk cascade), `type` (`stage_change`|`note`|`ai_generation`|`publish`), `from_status`, `to_status`, `detail`, `actor_name`, `created_at`

**`content_platform_variants`** — one row per platform per item.
- `id`, `content_item_id` (fk), `platform` (`instagram`|`linkedin`|`website`|`email`)
- `status` (`draft`|`ready`|`published`), `body` (adapted copy, markdown/text), `caption`, `hashtags` (jsonb)
- `template_id` (fk → templates, nullable), `render_config` (jsonb: text overrides, layout preset, colors)
- `rendered_asset_id` (fk → assets, nullable — the exported image/graphic)
- `scheduled_at`, `published_at`, `external_permalink`
- unique (`content_item_id`, `platform`)

**`content_assets`** — media library / lifecycle record for images.
- `id`, `content_item_id` (nullable — reusable assets allowed), `kind` (`upload`|`ai_generated`|`rendered`)
- `storage_path` (Supabase Storage), `public_url`, `width`, `height`, `mime`
- `source_url` (if pulled from the internet), `prompt` (if AI-generated), `alt_text`
- `created_by_name`, `created_at`

**`content_templates`** — visual + editorial presets (built by designers, reused by editors).
- `id`, `name`, `preview_asset_id`
- `layout` (jsonb: logo slot, title slot, image slots, safe areas — Hypebeast-style: brand mark top, big title bottom-left over image)
- `platform_formats` (jsonb: per-platform canvas size + adaptations, e.g. IG 1080×1350, LinkedIn 1200×627, Web 1600×900, Email 600 wide)
- `editorial` (jsonb: tone, text limits, hashtag policy, format notes)
- `is_shared` (bool), `created_by_name`, `created_at`, `updated_at`

Image files live in a Supabase Storage bucket `content-media` (private, served via
signed URLs or a public read bucket for published assets).

## Feature walkthrough (matches the 4 use cases)

### 1. Discover — agent-assisted news search
- `/admin/marketing` has a **"Find news"** action. Admin either picks from
  AI-suggested angles or types a desired topic/angle as steering context.
- A server route `app/api/marketing/discover/route.ts` runs an OpenAI
  web-search-enabled `generateText` (Responses API `web_search` tool) scoped to
  recent Physical AI / spatial / AI hardware / wearables news, and returns **4
  candidate topics**: `{ title, hook, why_viral, source_url, source_title,
  snippet, suggested_tags }`.
  - Fallback when no API key: a curated seed list + manual entry (same
    "graceful local fallback" convention used across the app).
- Selecting a candidate creates a `content_items` row in `idea` status with
  source provenance filled in.
- References for tone/format of the source articles: alphasignal.ai, hypebeast.com.

### 2. Draft — markdown editor
- `/admin/marketing/[id]` opens the item. Stage `drafting`.
- A markdown editor (word/pages-like) editing `body_markdown`. Start with a
  lightweight controlled `<textarea>` + live preview + formatting toolbar; no new
  heavy dependency required for v1 (can adopt a richer editor later).
- **AI assist**: "Draft from source" button generates a first draft from the
  chosen topic + source snippet (server route, local fallback template).
- **Images in the draft**: upload → store in `content_assets` (Storage) →
  insert markdown image ref. Basic crop via a client canvas before upload.
- "Confirm draft" moves status to `visual` and locks `body_markdown` as the
  master the platform variants derive from.

### 3. Per-platform adaptation
- Tabbed view: **Instagram · LinkedIn · Website · Email**. Each tab is a
  `content_platform_variants` row, all seeded from the single confirmed draft.
- "Adapt for {platform}" AI action rewrites the master into platform-native copy
  respecting the chosen template's `editorial` (tone, length limits, hashtags).
- Email variant plugs into the **existing campaigns pipeline** (`lib/admin/campaigns.ts`):
  a "Send as newsletter" hand-off creates a `campaigns` row from the email variant,
  reusing test-send / audience / batch send / scheduling that already exist.

### 3.1 Visual media editor (procedural marketing graphics)
- `/admin/marketing/[id]/visual` — a template-driven image composer.
- Editor renders the selected `content_templates.layout` onto an HTML5
  `<canvas>` (or SVG) per platform format: **logo + news title + image(s)**,
  Hypebeast style. Text and image slots are editable; layout adapts to each
  platform's canvas size from `platform_formats`.
- Image sources per slot: (a) upload, (b) paste internet URL, (c) **AI generate**
  via OpenAI image API (`gpt-image` / "image2") — a server route creates the
  image, stores it in `content_assets` as `ai_generated`.
- **Templates as presets**: designers create/save layouts (`content_templates`,
  `is_shared`). At the draft→visual handoff the editor **picks a template**; the
  chosen template's editorial prefs (tone, limits, format) also flow into the
  platform copy adaptation in step 3.
- "Export" rasterizes the canvas per platform → stores a `rendered` asset and
  links it on the platform variant (`rendered_asset_id`).

### 4. Approve, notify, publish
- "Approve" (stage `approved`) requires each intended platform variant to be
  `ready`. Writes `content_events` + `audit_log`.
- On approval, **email all admins** (reuse `lib/email/send.ts`) that content is
  ready to post, linking to the item.
- A **"Ready to post" queue** page lists approved items. Any admin can:
  - **Download all assets** for an item (zip of rendered images + copy per
    platform) to post manually in each channel for v1.
  - For **email**: reuse the campaigns batch send — test email first, then send
    to all subscribers or **schedule** a send time (already supported by
    `campaigns.scheduled_at` + send flow).
- Publishing marks variants/item `published` with `published_at` and optional
  `external_permalink`.
- **Future**: direct posting to each platform from one button (Instagram Graph
  API, LinkedIn API, website CMS) — designed for via `content_platform_variants`
  + `external_permalink`, not built in v1.

## Views

- **Kanban** — columns = stages; cards show thumbnail, title, tags, assignee,
  platform-ready badges. Drag to change stage (server action per drop).
- **Calendar** — month grid keyed on `scheduled_at` / `published_at`.
- **List** — dense table (title, stage, tags, assignee, platforms, updated),
  filter + search, matching the members-list density.
- View toggle persisted in a URL param, mirroring existing admin list pages.

## Environment additions

- `OPENAI_API_KEY` already present (reused for text + web search + images).
- Optional `OPENAI_IMAGE_MODEL` (default `gpt-image-1` / image2).
- Supabase Storage bucket `content-media` (add to setup notes + a migration/policy).
- No new required env for graceful-fallback local operation.

## Phasing

- **Phase 1 — Foundation:** migration + tables + Storage bucket, `Marketing`
  nav, `content_items` CRUD, List + Kanban views, manual create, stage
  transitions, timeline, audit. (Usable editorial board immediately.)
- **Phase 2 — Draft + Discover:** markdown editor with image upload/crop,
  AI "find news" (4 options / typed steering) + "draft from source".
- **Phase 3 — Platform variants:** per-platform tabs, AI adaptation, Email →
  campaigns hand-off. Calendar view.
- **Phase 4 — Visual studio:** template model, canvas composer, AI image gen,
  per-platform export/render.
- **Phase 5 — Approve & publish:** approval gate, admin email notify, ready-to-
  post queue, bulk asset download, scheduled email send. (Direct multi-platform
  posting deferred.)

## Decisions

1. Platforms: **Instagram, LinkedIn, Website, Email**.
2. Email publishing: **dedicated newsletter sender inside the marketing tool**
   (independent of the `campaigns` table). Reuses the email infra —
   `lib/email/send.ts` for sending and `lib/admin/audience.ts` for consent-aware
   recipient resolution — but records sends against the content item, not
   `campaigns`. New tables `content_email_sends` + `content_email_recipients`.
3. Draft editor: **adopt a markdown editor library** (`@uiw/react-md-editor`)
   for a word/pages-like editing + preview experience.
4. Approval: **any admin** can approve and publish (no second-approver gate).
5. Build scope: **all phases**, end to end.
