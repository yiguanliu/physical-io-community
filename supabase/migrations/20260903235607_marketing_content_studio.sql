-- Marketing Content Studio
-- Editorial workspace for planning, producing, and publishing marketing content
-- about Physical AI, spatial intelligence, AI hardware, and AI wearables.
--
-- All tables live in the exposed public schema but are server-only: the admin
-- workspace reads/writes through the Supabase service key (see lib/admin/store.ts).
-- Browser roles (anon, authenticated) are denied via RLS + REVOKE, matching the
-- outreach pipeline hardening.

-- ---------------------------------------------------------------------------
-- content_items: the source of truth for one story through its lifecycle.
-- ---------------------------------------------------------------------------
CREATE TABLE "content_items" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "slug" TEXT NOT NULL DEFAULT '',
    -- idea | drafting | visual | review | approved | scheduled | published | archived
    "status" TEXT NOT NULL DEFAULT 'idea',
    "category_tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "virality_score" INTEGER,
    "summary" TEXT NOT NULL DEFAULT '',
    "body_markdown" TEXT NOT NULL DEFAULT '',
    -- provenance of the topic: web | manual | ai
    "source_kind" TEXT NOT NULL DEFAULT 'manual',
    "source_url" TEXT NOT NULL DEFAULT '',
    "source_title" TEXT NOT NULL DEFAULT '',
    "source_snippet" TEXT NOT NULL DEFAULT '',
    "assigned_to" TEXT,
    "assigned_to_name" TEXT NOT NULL DEFAULT '',
    "created_by_user_id" TEXT,
    "created_by_name" TEXT NOT NULL DEFAULT '',
    "scheduled_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "content_items_status_idx" ON "content_items" ("status");
CREATE INDEX "content_items_scheduled_idx" ON "content_items" ("scheduled_at");
CREATE INDEX "content_items_updated_idx" ON "content_items" ("updated_at");

-- ---------------------------------------------------------------------------
-- content_events: the lifecycle record / timeline for an item.
-- ---------------------------------------------------------------------------
CREATE TABLE "content_events" (
    "id" TEXT PRIMARY KEY,
    "content_item_id" TEXT NOT NULL REFERENCES "content_items"("id") ON DELETE CASCADE,
    -- stage_change | note | ai_generation | asset | publish | email_send
    "type" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "detail" TEXT NOT NULL DEFAULT '',
    "actor_name" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "content_events_item_idx" ON "content_events" ("content_item_id", "created_at");

-- ---------------------------------------------------------------------------
-- content_templates: reusable visual + editorial presets (built by designers).
-- ---------------------------------------------------------------------------
CREATE TABLE "content_templates" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "preview_url" TEXT NOT NULL DEFAULT '',
    -- slots: logo, title, images, safe areas, colors (Hypebeast-style layout)
    "layout" JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- per-platform canvas sizes + adaptations
    "platform_formats" JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- tone, text limits, hashtag policy, format notes
    "editorial" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "is_shared" BOOLEAN NOT NULL DEFAULT true,
    "created_by_name" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "content_templates_shared_idx" ON "content_templates" ("is_shared", "updated_at");

-- ---------------------------------------------------------------------------
-- content_assets: media library + lifecycle for images.
-- ---------------------------------------------------------------------------
CREATE TABLE "content_assets" (
    "id" TEXT PRIMARY KEY,
    "content_item_id" TEXT REFERENCES "content_items"("id") ON DELETE CASCADE,
    -- upload | ai_generated | rendered
    "kind" TEXT NOT NULL DEFAULT 'upload',
    "storage_path" TEXT NOT NULL DEFAULT '',
    "public_url" TEXT NOT NULL DEFAULT '',
    "width" INTEGER,
    "height" INTEGER,
    "mime" TEXT NOT NULL DEFAULT 'image/png',
    "source_url" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL DEFAULT '',
    "alt_text" TEXT NOT NULL DEFAULT '',
    "created_by_name" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "content_assets_item_idx" ON "content_assets" ("content_item_id", "created_at");

-- ---------------------------------------------------------------------------
-- content_platform_variants: one row per platform per item, all derived from
-- the single confirmed master draft.
-- ---------------------------------------------------------------------------
CREATE TABLE "content_platform_variants" (
    "id" TEXT PRIMARY KEY,
    "content_item_id" TEXT NOT NULL REFERENCES "content_items"("id") ON DELETE CASCADE,
    -- instagram | linkedin | website | email
    "platform" TEXT NOT NULL,
    -- draft | ready | published
    "status" TEXT NOT NULL DEFAULT 'draft',
    "body" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "hashtags" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "template_id" TEXT REFERENCES "content_templates"("id") ON DELETE SET NULL,
    -- text overrides, chosen layout preset, colors for the rendered graphic
    "render_config" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "rendered_asset_id" TEXT REFERENCES "content_assets"("id") ON DELETE SET NULL,
    "scheduled_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "external_permalink" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "content_platform_variants_item_platform_idx"
    ON "content_platform_variants" ("content_item_id", "platform");

-- ---------------------------------------------------------------------------
-- content_email_sends + recipients: the dedicated newsletter sender for the
-- Email platform variant (independent of the campaigns table, but reusing the
-- consent-aware audience + Resend infra).
-- ---------------------------------------------------------------------------
CREATE TABLE "content_email_sends" (
    "id" TEXT PRIMARY KEY,
    "content_item_id" TEXT NOT NULL REFERENCES "content_items"("id") ON DELETE CASCADE,
    "variant_id" TEXT REFERENCES "content_platform_variants"("id") ON DELETE SET NULL,
    -- draft | test | scheduled | sending | sent | failed
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subject" TEXT NOT NULL DEFAULT '',
    "preview_text" TEXT NOT NULL DEFAULT '',
    "from_name" TEXT NOT NULL DEFAULT 'Physical I/O',
    "reply_to" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "audience_filter" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "scheduled_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "skip_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_name" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "content_email_sends_item_idx" ON "content_email_sends" ("content_item_id");

CREATE TABLE "content_email_recipients" (
    "id" TEXT PRIMARY KEY,
    "send_id" TEXT NOT NULL REFERENCES "content_email_sends"("id") ON DELETE CASCADE,
    "member_id" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "skip_reason" TEXT,
    "provider_id" TEXT,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "content_email_recipients_send_idx" ON "content_email_recipients" ("send_id");

-- ---------------------------------------------------------------------------
-- Supabase hardening: server-only tables in the exposed public schema.
-- ---------------------------------------------------------------------------
ALTER TABLE "content_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_platform_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_email_sends" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_email_recipients" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  "content_items",
  "content_events",
  "content_templates",
  "content_assets",
  "content_platform_variants",
  "content_email_sends",
  "content_email_recipients"
FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded / AI-generated / rendered marketing media.
-- Public read so published graphics can be embedded; writes go through the
-- service key only.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-media', 'content-media', true)
ON CONFLICT (id) DO NOTHING;
