import { type OutreachTypeValue, typeLabel } from "@/lib/outreach/outreach-config";
import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { generateText } from "ai";

type DraftInput = {
  type: OutreachTypeValue;
  tone: string;
  outputLength: "concise" | "medium" | "detailed";
  customContext?: string;
  template?: {
    label: string;
    prompt: string;
    context: string;
  } | null;
  senderPersona?: {
    fullName: string;
    roleTitle: string;
    organization: string;
    linkedinUrl: string | null;
    email: string | null;
    introduction: string;
    personaDetails: string;
    personalConnectionGuidance: string;
  } | null;
  memoryDocuments?: Array<{
    id?: string;
    title: string;
    sourceName: string | null;
    tags: string[];
    snippet: string;
    source?: "attached" | "ranked";
  }>;
  lead: {
    fullName: string | null;
    title: string | null;
    linkedinUrl: string;
    category: string;
    industryCategory: string;
    notes: string | null;
    company: {
      name: string;
      industryCategory: string;
    } | null;
  };
};

function firstName(name: string | null) {
  if (!name) {
    return "there";
  }

  return name.trim().split(/\s+/)[0] || "there";
}

function companyName(input: DraftInput) {
  return input.lead.company?.name ?? "your team";
}

function senderVoice(input: DraftInput) {
  if (!input.senderPersona) {
    return {
      pronoun: "We",
      signature: "Physical.IO team",
    };
  }

  return {
    pronoun: "I",
    signature: input.senderPersona.fullName,
  };
}

function contextLine(input: DraftInput) {
  const role = input.lead.title ? `${input.lead.title} at ${companyName(input)}` : companyName(input);
  const category = input.lead.industryCategory || input.lead.category;
  const voice = senderVoice(input);
  const builder = voice.pronoun === "I" ? "I am" : "we are";

  return `${voice.pronoun} came across your work as ${role} and thought it connected well with what ${builder} building around ${category}.`;
}

function memoryContext(input: DraftInput) {
  if (!input.memoryDocuments?.length) {
    return "No memory documents matched this lead. Use only the lead and template context.";
  }

  return input.memoryDocuments
    .map((document, index) => {
      const tags = document.tags.length ? ` Tags: ${document.tags.join(", ")}.` : "";
      const source = document.source === "attached" ? " SOURCE OF TRUTH." : "";
      return `${index + 1}. ${document.title}${document.sourceName ? ` (${document.sourceName})` : ""}.${source}${tags}\n${document.snippet}`;
    })
    .join("\n\n");
}

export function generateLocalDraft(input: DraftInput) {
  const name = firstName(input.lead.fullName);
  const event = "Physical.IO";
  const voice = senderVoice(input);
  const note = input.lead.notes ? `\n\n${voice.pronoun} noticed: ${input.lead.notes}` : "";
  const customContext = input.customContext?.trim()
    ? `\n\nExtra context to include: ${input.customContext.trim()}`
    : "";
  const signature = `\n\nBest,\n${voice.signature}`;
  const senderIntro = input.senderPersona?.introduction
    ? `\n\nBy way of context, ${input.senderPersona.introduction}`
    : "";

  const openings: Record<OutreachTypeValue, string> = {
    EVENT_INVITATION: `Hi ${name}, ${contextLine(input)} ${voice.pronoun} would love to invite you to a ${event} session.`,
    COLLABORATION_INVITATION: `Hi ${name}, ${contextLine(input)} ${voice.pronoun} think there may be a useful collaboration angle between ${companyName(input)} and ${event}.`,
    ARRANGE_MEETING: `Hi ${name}, ${contextLine(input)} Would you be open to a short conversation next week?`,
    COMMUNITY_INTRO: `Hi ${name}, ${contextLine(input)} ${voice.pronoun === "I" ? "I run" : "We run"} ${event}, a community for people working across physical AI, robotics, and embodied systems.`,
    FOLLOW_UP: `Hi ${name}, just wanted to quickly follow up in case this got buried.`,
  };

  const asks: Record<OutreachTypeValue, string> = {
    EVENT_INVITATION:
      "Would you be open to joining us as a guest, speaker, or attendee? Happy to send the context and format.",
    COLLABORATION_INVITATION:
      `If this is relevant, ${voice.pronoun === "I" ? "I would" : "we would"} like to compare notes and see whether there is a practical way to work together.`,
    ARRANGE_MEETING:
      "A 20-minute call would be enough to share context and see whether there is a useful next step.",
    COMMUNITY_INTRO:
      `Would you like ${voice.pronoun === "I" ? "me" : "us"} to send more details, or introduce you to a small group working in this area?`,
    FOLLOW_UP:
      `No worries if now is not the right time. If useful, ${voice.pronoun === "I" ? "I can" : "we can"} send a short context note and leave it with you.`,
  };

  const detail = input.outputLength === "detailed" ? senderIntro : "";
  const body = `${openings[input.type]}\n\n${asks[input.type]}${detail}${note}${customContext}${signature}`;

  return {
    provider: "local" as const,
    subject: `${typeLabel(input.type)} for ${companyName(input)}`,
    body,
  };
}

function leadContext(input: DraftInput) {
  return {
    outreach_type: typeLabel(input.type),
    tone: input.tone,
    lead_name: input.lead.fullName,
    lead_title: input.lead.title,
    linkedin_url: input.lead.linkedinUrl,
    company: input.lead.company?.name,
    lead_category: input.lead.category,
    industry_category: input.lead.industryCategory,
    notes: input.lead.notes,
    custom_context: input.customContext?.trim() || null,
    template: input.template,
  };
}

function senderContext(input: DraftInput) {
  if (!input.senderPersona) {
    return {
      mode: "official_team_fallback",
      name: "Physical.IO official team",
      instruction:
        "No @sender was attached. Write from the default Physical.IO official team tone and do not imply a named individual is sending.",
    };
  }

  return {
    mode: "attached_sender",
    name: input.senderPersona.fullName,
    role_title: input.senderPersona.roleTitle,
    organization: input.senderPersona.organization,
    linkedin_url: input.senderPersona.linkedinUrl,
    email: input.senderPersona.email,
    introduction: input.senderPersona.introduction,
    persona_details: input.senderPersona.personaDetails,
    personal_connection_guidance: input.senderPersona.personalConnectionGuidance,
  };
}

const outputLengthSettings = {
  concise: {
    maxOutputTokens: 280,
    textVerbosity: "low",
    instruction: "Write 55-90 words in two short paragraphs.",
  },
  medium: {
    maxOutputTokens: 420,
    textVerbosity: "medium",
    instruction: "Write 90-140 words in two or three short paragraphs.",
  },
  detailed: {
    maxOutputTokens: 680,
    textVerbosity: "high",
    instruction: "Write 140-220 words with enough sender and personal context to feel specific.",
  },
} as const;

export async function generateDraft(input: DraftInput) {
  const fallback = generateLocalDraft(input);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.6-sol";
  const lengthSettings = outputLengthSettings[input.outputLength];

  const result = await generateText({
    model: openai.responses(model),
    instructions:
      "Draft a copy-ready LinkedIn DM for outreach. Return only the message body. Keep it specific, natural, and easy to paste. Treat attached SOURCE OF TRUTH memory documents as authoritative. Use other relevant memory only when it helps. Do not invent facts, dates, mutual contacts, metrics, or event details not provided. Use short paragraphs. If @sender is attached, write as that person and use their introduction/persona details. If no @sender is attached, write from the default Physical.IO official team tone. Always make the message personal by using an evidence-backed connection to the recipient; if no personal connection evidence exists, acknowledge the recipient's role/company/category rather than inventing one. End with 'Best,' and the sender name, or 'Physical.IO team' when no @sender is attached.",
    prompt: JSON.stringify({
      lead: leadContext(input),
      sender: senderContext(input),
      memory_documents: memoryContext(input),
      output_length: {
        value: input.outputLength,
        instruction: lengthSettings.instruction,
      },
      output_rules: [
        "Preserve the selected template purpose.",
        "Use custom_context as a direct user instruction when provided.",
        "Use @sender introduction and persona details to clarify who is writing when sender.mode is attached_sender.",
        "When sender.mode is official_team_fallback, avoid first-person named details and use Physical.IO official team voice.",
        "Include a personal connection only when it is grounded in lead data, custom_context, memory_documents, or sender context.",
        "If a memory document is marked SOURCE OF TRUTH, prefer it over inferred or ranked context.",
        "Mention Physical.IO positioning only when supported by memory.",
        "Avoid generic hype and keep the ask easy to answer.",
      ],
    }),
    maxOutputTokens: lengthSettings.maxOutputTokens,
    providerOptions: {
      openai: {
        reasoningEffort: "none",
        textVerbosity: lengthSettings.textVerbosity,
      } satisfies OpenAILanguageModelResponsesOptions,
    },
  }).catch(() => null);

  if (!result?.text) {
    return fallback;
  }

  const body = result.text.trim();

  if (!body) {
    return fallback;
  }

  return {
    provider: "openai" as const,
    subject: fallback.subject,
    body,
  };
}
