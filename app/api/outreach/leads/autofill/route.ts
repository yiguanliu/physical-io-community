import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/api";
import { industryCategories } from "@/lib/outreach/outreach-config";

const autofillSchema = z.object({
  linkedinUrl: z.string().url().refine((value) => value.includes("linkedin.com/"), {
    message: "Use a LinkedIn profile URL.",
  }),
  profileText: z.string().trim().max(12_000).optional(),
});

type AutofillResult = {
  fullName: string;
  title: string;
  companyName: string;
  location: string;
  industryCategory: string;
  category: string;
  notes: string;
  priority: number;
  source: "url" | "profile_text" | "local_profile_text";
};

function inferredNameFromUrl(linkedinUrl: string) {
  const slug = linkedinUrl.split("/in/")[1]?.split(/[/?#]/)[0];

  if (!slug) {
    return "";
  }

  return slug
    .replace(/-\d+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function localProfileTextExtract(linkedinUrl: string, profileText: string): AutofillResult {
  const lines = profileText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fullName = lines[0] && !/linkedin|profile|contact info/i.test(lines[0]) ? lines[0] : inferredNameFromUrl(linkedinUrl);
  const titleLine = lines.find((line) => /\bat\b|\bfounder\b|\bengineer\b|\bresearcher\b|\bdesigner\b|\bceo\b/i.test(line)) ?? "";
  const [title, companyName] = titleLine.split(/\s+at\s+/i);
  const location = lines.find((line) => /london|san francisco|new york|berlin|paris|oxford|cambridge|united kingdom|united states/i.test(line)) ?? "";

  return {
    fullName,
    title: title?.trim() ?? "",
    companyName: companyName?.trim() ?? "",
    location,
    industryCategory: "Physical AI",
    category: "Prospect",
    notes: lines.slice(0, 12).join(" ").slice(0, 500),
    priority: 2,
    source: "local_profile_text",
  };
}

function parseJsonObject(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced ?? value;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(raw.slice(start, end + 1)) as Partial<AutofillResult>;
  } catch {
    return null;
  }
}

function cleanResult(linkedinUrl: string, result: Partial<AutofillResult>, source: AutofillResult["source"]) {
  const industry = industryCategories.includes(result.industryCategory as (typeof industryCategories)[number])
    ? result.industryCategory
    : "Physical AI";
  const priority =
    typeof result.priority === "number" &&
    Number.isInteger(result.priority) &&
    result.priority >= 1 &&
    result.priority <= 3
      ? result.priority
      : 2;

  return {
    fullName: result.fullName?.trim() || inferredNameFromUrl(linkedinUrl),
    title: result.title?.trim() || "",
    companyName: result.companyName?.trim() || "",
    location: result.location?.trim() || "",
    industryCategory: industry ?? "Physical AI",
    category: result.category?.trim() || "Prospect",
    notes: result.notes?.trim() || "",
    priority,
    source,
  } satisfies AutofillResult;
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const payload = autofillSchema.parse(await request.json());
  const profileText = payload.profileText?.trim() ?? "";

  if (!profileText) {
    return NextResponse.json({
      autofill: cleanResult(payload.linkedinUrl, {}, "url"),
      message: "URL-only autofill can infer the name. Paste copied LinkedIn profile text to fill more fields.",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      autofill: localProfileTextExtract(payload.linkedinUrl, profileText),
      message: "OpenAI API key is unavailable, so a local text parser was used.",
    });
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.6-sol";
  const result = await generateText({
    model: openai.responses(model),
    instructions:
      "Extract lead fields from pasted LinkedIn profile text. Return only a JSON object. Do not guess facts that are not in the text. Use empty strings for unknown text fields. Priority must be 1 high, 2 normal, or 3 low.",
    prompt: JSON.stringify({
      linkedin_url: payload.linkedinUrl,
      allowed_industry_categories: industryCategories,
      output_shape: {
        fullName: "string",
        title: "string",
        companyName: "string",
        location: "string",
        industryCategory: "one allowed industry category",
        category: "short lead category, e.g. Founder, Researcher, Investor, Designer, Community lead, Prospect",
        notes: "one concise factual context note from the profile text",
        priority: "1, 2, or 3",
      },
      profile_text: profileText,
    }),
    maxOutputTokens: 600,
    providerOptions: {
      openai: {
        reasoningEffort: "none",
        textVerbosity: "low",
      } satisfies OpenAILanguageModelResponsesOptions,
    },
  }).catch(() => null);

  const parsed = result?.text ? parseJsonObject(result.text) : null;

  return NextResponse.json({
    autofill: parsed
      ? cleanResult(payload.linkedinUrl, parsed, "profile_text")
      : localProfileTextExtract(payload.linkedinUrl, profileText),
    message: parsed ? "Autofill extracted from pasted profile text." : "OpenAI extraction failed, so a local parser was used.",
  });
}
