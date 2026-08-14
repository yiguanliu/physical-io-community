-- Outreach pipeline schema, adapted from the standalone Prisma application.
-- The application currently uses a server-only DATABASE_URL; browser roles have no table access.

-- CreateEnum
CREATE TYPE "OutreachStage" AS ENUM ('NEW_RESEARCH', 'DRAFTED', 'SENT', 'FOLLOW_UP', 'REPLIED', 'MEETING_BOOKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OutreachType" AS ENUM ('EVENT_INVITATION', 'COLLABORATION_INVITATION', 'ARRANGE_MEETING', 'COMMUNITY_INTRO', 'FOLLOW_UP');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industryCategory" TEXT NOT NULL,
    "website" TEXT,
    "linkedinUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "fullName" TEXT,
    "title" TEXT,
    "location" TEXT,
    "category" TEXT NOT NULL,
    "industryCategory" TEXT NOT NULL,
    "stage" "OutreachStage" NOT NULL DEFAULT 'NEW_RESEARCH',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "OutreachType" NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'warm',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "copiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachTemplate" (
    "id" TEXT NOT NULL,
    "type" "OutreachType" NOT NULL,
    "label" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStage" "OutreachStage",
    "toStage" "OutreachStage" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_linkedinUrl_key" ON "Lead"("linkedinUrl");

-- CreateIndex
CREATE INDEX "Lead_stage_priority_idx" ON "Lead"("stage", "priority");

-- CreateIndex
CREATE INDEX "Lead_industryCategory_idx" ON "Lead"("industryCategory");

-- CreateIndex
CREATE INDEX "Lead_companyId_idx" ON "Lead"("companyId");

-- CreateIndex
CREATE INDEX "OutreachMessage_leadId_createdAt_idx" ON "OutreachMessage"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "OutreachMessage_type_idx" ON "OutreachMessage"("type");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachTemplate_type_key" ON "OutreachTemplate"("type");

-- CreateIndex
CREATE INDEX "StageHistory_leadId_changedAt_idx" ON "StageHistory"("leadId", "changedAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachMessage" ADD CONSTRAINT "OutreachMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageHistory" ADD CONSTRAINT "StageHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "OutreachTemplate"
ADD COLUMN "context" TEXT NOT NULL DEFAULT '',
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing seed templates as default templates.
UPDATE "OutreachTemplate" SET "isDefault" = true;

-- DropIndex
DROP INDEX IF EXISTS "OutreachTemplate_type_key";

-- CreateIndex
CREATE INDEX "OutreachTemplate_type_idx" ON "OutreachTemplate"("type");

-- CreateTable
CREATE TABLE "MemoryDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceName" TEXT,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoryDocument_isActive_updatedAt_idx" ON "MemoryDocument"("isActive", "updatedAt");

-- CreateTable
CREATE TABLE "SenderPersona" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "organization" TEXT NOT NULL DEFAULT 'Physical.IO',
    "linkedinUrl" TEXT,
    "email" TEXT,
    "introduction" TEXT NOT NULL DEFAULT '',
    "personaDetails" TEXT NOT NULL DEFAULT '',
    "personalConnectionGuidance" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SenderPersona_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SenderPersona_isActive_isDefault_idx" ON "SenderPersona"("isActive", "isDefault");

-- Supabase hardening: these tables live in the exposed public schema but are server-only.
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutreachMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutreachTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StageHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MemoryDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SenderPersona" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  "Company",
  "Lead",
  "OutreachMessage",
  "OutreachTemplate",
  "StageHistory",
  "MemoryDocument",
  "SenderPersona"
FROM anon, authenticated;
