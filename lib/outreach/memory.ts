import type { MemoryDocument } from "@/generated/prisma/client";

type MemoryInput = {
  type: string;
  tone: string;
  customContext?: string;
  lead: {
    fullName: string | null;
    title: string | null;
    category: string;
    industryCategory: string;
    notes: string | null;
    company: {
      name: string;
      industryCategory: string;
    } | null;
  };
  template?: {
    label: string;
    prompt: string;
    context: string;
  } | null;
};

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "lead",
  "draft",
  "message",
  "outreach",
]);

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function snippet(content: string, keywords: string[]) {
  const lower = content.toLowerCase();
  const index = keywords.map((word) => lower.indexOf(word)).find((position) => position >= 0) ?? 0;
  const start = Math.max(0, index - 220);

  return content
    .slice(start, start + 900)
    .replace(/\s+/g, " ")
    .trim();
}

export function rankMemoryDocuments(input: MemoryInput, documents: MemoryDocument[]) {
  const query = [
    input.type,
    input.tone,
    input.customContext,
    input.lead.fullName,
    input.lead.title,
    input.lead.category,
    input.lead.industryCategory,
    input.lead.notes,
    input.lead.company?.name,
    input.lead.company?.industryCategory,
    input.template?.label,
    input.template?.prompt,
    input.template?.context,
  ]
    .filter(Boolean)
    .join(" ");

  const keywords = tokenize(query);

  return documents
    .map((document) => {
      const searchable = [
        document.title,
        document.sourceName,
        document.summary,
        document.tags.join(" "),
        document.content,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const score = keywords.reduce((total, keyword) => {
        if (document.title.toLowerCase().includes(keyword)) {
          return total + 5;
        }
        if (document.tags.some((tag) => tag.toLowerCase().includes(keyword))) {
          return total + 4;
        }
        if (searchable.includes(keyword)) {
          return total + 1;
        }
        return total;
      }, 0);

      return {
        id: document.id,
        title: document.title,
        sourceName: document.sourceName,
        tags: document.tags,
        score,
        snippet: snippet(document.content, keywords),
      };
    })
    .filter((document) => document.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}
