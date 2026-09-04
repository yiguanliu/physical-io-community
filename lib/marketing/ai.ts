// AI helpers for the Marketing Content Studio.
// Every function degrades gracefully to a deterministic local result when
// OPENAI_API_KEY is unset, matching lib/outreach/drafting.ts.

import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { generateText } from "ai";
import { PLATFORM_META, SUGGESTED_TAGS, type Platform } from "@/lib/marketing/config";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-sol";

function hasKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function parseJsonBlock<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced ?? text;
  const start = raw.indexOf("[") >= 0 ? Math.min(...[raw.indexOf("["), raw.indexOf("{")].filter((n) => n >= 0)) : raw.indexOf("{");
  const lastArr = raw.lastIndexOf("]");
  const lastObj = raw.lastIndexOf("}");
  const end = Math.max(lastArr, lastObj);
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Discover — surface recent, viral-leaning Physical AI news.
// ---------------------------------------------------------------------------
export type NewsCandidate = {
  title: string;
  hook: string;
  whyViral: string;
  sourceUrl: string;
  sourceTitle: string;
  snippet: string;
  suggestedTags: string[];
};

const SEED_CANDIDATES: NewsCandidate[] = [
  {
    title: "Humanoid robots hit the factory floor",
    hook: "The first wave of general-purpose humanoids is shipping to real warehouses — here's what actually changed.",
    whyViral: "Concrete proof-of-work beats demos; people love 'robots taking jobs' debate.",
    sourceUrl: "",
    sourceTitle: "",
    snippet: "",
    suggestedTags: ["Physical AI", "Humanoids", "Robotics"],
  },
  {
    title: "The wearable that reads your surroundings",
    hook: "A new AI wearable turns spatial context into always-on assistance without a screen.",
    whyViral: "Ambient computing + privacy tension is highly shareable.",
    sourceUrl: "",
    sourceTitle: "",
    snippet: "",
    suggestedTags: ["AI Wearables", "Spatial Intelligence", "AI Hardware"],
  },
  {
    title: "World models replace hand-tuned simulation",
    hook: "Learned world models are quietly outperforming physics engines for robotics and forecasting.",
    whyViral: "'AI beats physics' is a strong, debate-sparking narrative.",
    sourceUrl: "",
    sourceTitle: "",
    snippet: "",
    suggestedTags: ["Physical AI", "Research", "Spatial Intelligence"],
  },
  {
    title: "A rare piece of computing history goes to auction",
    hook: "Hardware nostalgia meets today's AI hardware race — why the past keeps setting records.",
    whyViral: "Culture + collectible angle travels beyond the tech crowd.",
    sourceUrl: "",
    sourceTitle: "",
    snippet: "",
    suggestedTags: ["AI Hardware", "Culture"],
  },
];

function cleanCandidate(raw: Partial<NewsCandidate>): NewsCandidate {
  const tags = Array.isArray(raw.suggestedTags)
    ? raw.suggestedTags.filter((t) => typeof t === "string").slice(0, 4)
    : [];
  return {
    title: (raw.title ?? "").toString().trim().slice(0, 160) || "Untitled angle",
    hook: (raw.hook ?? "").toString().trim().slice(0, 400),
    whyViral: (raw.whyViral ?? "").toString().trim().slice(0, 400),
    sourceUrl: (raw.sourceUrl ?? "").toString().trim(),
    sourceTitle: (raw.sourceTitle ?? "").toString().trim().slice(0, 200),
    snippet: (raw.snippet ?? "").toString().trim().slice(0, 600),
    suggestedTags: tags.length ? tags : ["Physical AI"],
  };
}

export async function discoverNews(steer?: string): Promise<{ candidates: NewsCandidate[]; provider: "openai" | "local" }> {
  if (!hasKey()) {
    return { candidates: SEED_CANDIDATES, provider: "local" };
  }

  const focus = steer?.trim()
    ? `The editor is specifically looking for content about: "${steer.trim()}". Bias the angles toward that.`
    : "Cover a spread across humanoids, robotics, AI hardware, AI wearables, and spatial intelligence.";

  // Try with the OpenAI web search tool for live results; fall back to model
  // knowledge, then to seeds.
  const attempt = async (useWebSearch: boolean) => {
    return generateText({
      model: openai.responses(MODEL),
      ...(useWebSearch ? { tools: { web_search: openai.tools.webSearchPreview({}) }, toolChoice: "auto" as const } : {}),
      instructions:
        "You are the editor for Physical I/O, a community for Physical AI, robotics, spatial intelligence, AI hardware, and AI wearables. Propose exactly 4 timely, viral-leaning content angles. Return ONLY a JSON array of objects with keys: title, hook, whyViral, sourceUrl, sourceTitle, snippet, suggestedTags (array). When you use web results, cite the real article URL in sourceUrl and a short factual snippet. Never invent URLs — leave sourceUrl empty if unsure.",
      prompt: JSON.stringify({
        focus,
        allowed_tags: SUGGESTED_TAGS,
        want: 4,
      }),
      maxOutputTokens: 1400,
      providerOptions: {
        openai: { reasoningEffort: "low", textVerbosity: "low" } satisfies OpenAILanguageModelResponsesOptions,
      },
    });
  };

  let result = await attempt(true).catch(() => null);
  if (!result?.text) result = await attempt(false).catch(() => null);

  const parsed = result?.text ? parseJsonBlock<Partial<NewsCandidate>[]>(result.text) : null;
  if (!parsed || !Array.isArray(parsed) || !parsed.length) {
    return { candidates: SEED_CANDIDATES, provider: "local" };
  }
  return { candidates: parsed.slice(0, 4).map(cleanCandidate), provider: "openai" };
}

// ---------------------------------------------------------------------------
// 2. Draft — expand a topic + source into a master markdown draft.
// ---------------------------------------------------------------------------
export function localDraft(input: { title: string; hook?: string; sourceTitle?: string; sourceUrl?: string; snippet?: string }) {
  const lines = [
    `# ${input.title}`,
    "",
    input.hook || "A quick, high-signal take for the Physical I/O community.",
    "",
    "## Why it matters",
    "",
    "- Point one — what changed.",
    "- Point two — why it's a leap, not an increment.",
    "- Point three — what to watch next.",
    "",
    "## The context",
    "",
    input.snippet || "Add the key facts and your angle here.",
    "",
  ];
  if (input.sourceUrl) lines.push(`> Source: [${input.sourceTitle || input.sourceUrl}](${input.sourceUrl})`, "");
  return lines.join("\n");
}

export async function draftFromSource(input: {
  title: string;
  hook?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  snippet?: string;
  tags?: string[];
}): Promise<{ body: string; provider: "openai" | "local" }> {
  const fallback = localDraft(input);
  if (!hasKey()) return { body: fallback, provider: "local" };

  const result = await generateText({
    model: openai.responses(MODEL),
    instructions:
      "Write a punchy but credible newsletter-style draft in Markdown for Physical I/O, a Physical AI / robotics / spatial intelligence / AI hardware / wearables community. Lead with a strong hook, use short paragraphs and a few scannable bullets, keep it factual, and do not invent specific numbers, dates, or quotes not present in the provided source. End with a forward-looking line. Return only Markdown.",
    prompt: JSON.stringify({
      title: input.title,
      hook: input.hook ?? "",
      source: { title: input.sourceTitle ?? "", url: input.sourceUrl ?? "", snippet: input.snippet ?? "" },
      tags: input.tags ?? [],
    }),
    maxOutputTokens: 900,
    providerOptions: {
      openai: { reasoningEffort: "none", textVerbosity: "medium" } satisfies OpenAILanguageModelResponsesOptions,
    },
  }).catch(() => null);

  const body = result?.text?.trim();
  return body ? { body, provider: "openai" } : { body: fallback, provider: "local" };
}

// ---------------------------------------------------------------------------
// 3. Adapt — rewrite the master draft for a specific platform.
// ---------------------------------------------------------------------------
export function localAdapt(platform: Platform, master: string, title: string) {
  const meta = PLATFORM_META[platform];
  const plain = master.replace(/[#>*_`]/g, "").replace(/\n{2,}/g, "\n").trim();
  if (platform === "email" || platform === "website") {
    return { body: master, caption: title, hashtags: [] as string[] };
  }
  const trimmed = plain.slice(0, Math.min(meta.captionLimit, 600));
  const hashtags = platform === "instagram" ? ["#PhysicalAI", "#Robotics", "#AIHardware"] : ["#PhysicalAI", "#SpatialIntelligence"];
  return { body: trimmed, caption: title, hashtags };
}

export async function adaptForPlatform(input: {
  platform: Platform;
  master: string;
  title: string;
  editorial?: { tone?: string; textLimit?: number; hashtagPolicy?: string; format?: string };
}): Promise<{ body: string; caption: string; hashtags: string[]; provider: "openai" | "local" }> {
  const fallback = localAdapt(input.platform, input.master, input.title);
  if (!hasKey()) return { ...fallback, provider: "local" };

  const meta = PLATFORM_META[input.platform];
  const tone = input.editorial?.tone || meta.tone;
  const limit = input.editorial?.textLimit || meta.captionLimit;

  const result = await generateText({
    model: openai.responses(MODEL),
    instructions:
      "Adapt a master content draft into platform-native copy. Preserve the facts and angle of the master; only change voice, length, and format for the target platform. Return ONLY a JSON object with keys: body (the platform copy, plain text or light markdown), caption (a one-line hook/title), hashtags (array of strings, empty for website and email). Respect the tone and character limit. Do not add facts not in the master.",
    prompt: JSON.stringify({
      platform: input.platform,
      tone,
      character_limit: limit,
      hashtag_policy: input.editorial?.hashtagPolicy ?? (input.platform === "instagram" ? "3-6 relevant tags" : input.platform === "linkedin" ? "0-3 tags" : "none"),
      format_notes: input.editorial?.format ?? "",
      title: input.title,
      master: input.master,
    }),
    maxOutputTokens: 900,
    providerOptions: {
      openai: { reasoningEffort: "none", textVerbosity: "low" } satisfies OpenAILanguageModelResponsesOptions,
    },
  }).catch(() => null);

  const parsed = result?.text ? parseJsonBlock<{ body?: string; caption?: string; hashtags?: string[] }>(result.text) : null;
  if (!parsed || !parsed.body) return { ...fallback, provider: "local" };
  return {
    body: parsed.body,
    caption: parsed.caption?.trim() || input.title,
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((t) => typeof t === "string").slice(0, 8) : [],
    provider: "openai",
  };
}
