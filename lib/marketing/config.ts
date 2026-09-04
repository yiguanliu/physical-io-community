// Shared constants + types for the Marketing Content Studio.
// See docs/marketing-content-studio.md.

export const CONTENT_STAGES = [
  "idea",
  "drafting",
  "visual",
  "review",
  "approved",
  "scheduled",
  "published",
  "archived",
] as const;

export type ContentStage = (typeof CONTENT_STAGES)[number];

export const STAGE_META: Record<ContentStage, { label: string; hint: string }> = {
  idea: { label: "Idea", hint: "Topic captured, not yet drafted" },
  drafting: { label: "Drafting", hint: "Writing the master draft" },
  visual: { label: "Visual", hint: "Building graphics and platform variants" },
  review: { label: "Review", hint: "Ready for an editor to check" },
  approved: { label: "Approved", hint: "Cleared to post" },
  scheduled: { label: "Scheduled", hint: "Queued for a publish time" },
  published: { label: "Published", hint: "Live" },
  archived: { label: "Archived", hint: "Parked or retired" },
};

// Columns shown on the Kanban board (archived is hidden by default).
export const BOARD_STAGES: ContentStage[] = [
  "idea",
  "drafting",
  "visual",
  "review",
  "approved",
  "scheduled",
  "published",
];

export function isContentStage(value: unknown): value is ContentStage {
  return typeof value === "string" && (CONTENT_STAGES as readonly string[]).includes(value);
}

export const PLATFORMS = ["instagram", "linkedin", "website", "email"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_META: Record<
  Platform,
  { label: string; canvas: { width: number; height: number }; captionLimit: number; tone: string }
> = {
  instagram: { label: "Instagram", canvas: { width: 1080, height: 1350 }, captionLimit: 2200, tone: "punchy, visual, hook-led" },
  linkedin: { label: "LinkedIn", canvas: { width: 1200, height: 627 }, captionLimit: 3000, tone: "insightful, credible, professional" },
  website: { label: "Website", canvas: { width: 1600, height: 900 }, captionLimit: 100000, tone: "editorial, in-depth" },
  email: { label: "Email", canvas: { width: 600, height: 400 }, captionLimit: 100000, tone: "warm, direct, newsletter" },
};

export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as readonly string[]).includes(value);
}

/**
 * Platforms whose copy has been signed off. Approval is gated on this so an
 * item can't be announced to every admin while every variant is still a draft.
 */
export function readyPlatforms(variants: Array<{ platform: Platform; status: string }>): Platform[] {
  return PLATFORMS.filter((platform) =>
    variants.some((variant) => variant.platform === platform && (variant.status === "ready" || variant.status === "published")),
  );
}

// Default category tags relevant to Physical I/O's editorial focus.
export const SUGGESTED_TAGS = [
  "Physical AI",
  "Spatial Intelligence",
  "AI Hardware",
  "AI Wearables",
  "Robotics",
  "Humanoids",
  "Embodied AI",
  "Sensors",
  "Funding",
  "Research",
  "Product Launch",
  "Culture",
] as const;

export const STORAGE_BUCKET = "content-media";
