// Minimal Markdown renderer for newsletter sends.
// The studio stores the master draft (and the email variant) as Markdown, so a
// send has to produce inline-styled HTML plus a readable plain-text
// alternative — otherwise subscribers receive raw "##" and "![](…)" syntax.
// Deliberately small and dependency-free: it covers what the draft editor can
// produce (headings, bullets, ordered lists, quotes, rules, links, images,
// bold/italic/code) and escapes everything else.

import { escapeHtml } from "@/lib/email/send";

const SAFE_URL = /^(https?:\/\/|mailto:)/i;
const LINK_COLOR = "#b83c12";
const INK = "#171714";
const MUTED = "#5f5e58";

function safeUrl(raw: string) {
  const url = raw.trim();
  return SAFE_URL.test(url) ? url : "";
}

/** Inline markers inside an already-escaped block of text. */
function renderInline(raw: string) {
  let out = escapeHtml(raw);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (_match, alt: string, href: string) => {
    const url = safeUrl(href);
    if (!url) return alt;
    return `<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;border-radius:10px;margin:6px 0;" />`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (_match, label: string, href: string) => {
    const url = safeUrl(href);
    if (!url) return label;
    return `<a href="${url}" style="color:${LINK_COLOR};">${label}</a>`;
  });
  out = out.replace(/`([^`]+)`/g, `<code style="background:#f0efea;border-radius:4px;padding:1px 4px;">$1</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_\w])_([^_\n]+)_(?![\w])/g, "$1<em>$2</em>");
  return out;
}

function paragraph(lines: string[]) {
  const body = lines.map(renderInline).join("<br/>");
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${INK};">${body}</p>`;
}

function heading(level: number, text: string) {
  const size = level === 1 ? 24 : level === 2 ? 19 : 16;
  const space = level === 1 ? "0 0 14px" : "22px 0 10px";
  return `<h${level} style="margin:${space};font-size:${size}px;line-height:1.3;color:${INK};font-weight:700;">${renderInline(text)}</h${level}>`;
}

function list(items: string[], ordered: boolean) {
  const tag = ordered ? "ol" : "ul";
  const body = items
    .map((item) => `<li style="margin:0 0 6px;font-size:16px;line-height:1.6;color:${INK};">${renderInline(item)}</li>`)
    .join("");
  return `<${tag} style="margin:0 0 16px;padding-left:22px;">${body}</${tag}>`;
}

function quote(lines: string[]) {
  const body = lines.map(renderInline).join("<br/>");
  return `<blockquote style="margin:0 0 16px;padding:2px 0 2px 14px;border-left:3px solid #deddd6;color:${MUTED};font-size:15px;line-height:1.6;">${body}</blockquote>`;
}

/** Render Markdown to email-safe HTML (all input is escaped first). */
export function markdownToHtml(markdown: string): string {
  const lines = (markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let buffer: string[] = [];
  let mode: "paragraph" | "quote" | "ul" | "ol" | null = null;

  const flush = () => {
    if (!buffer.length) {
      mode = null;
      return;
    }
    if (mode === "ul") blocks.push(list(buffer, false));
    else if (mode === "ol") blocks.push(list(buffer, true));
    else if (mode === "quote") blocks.push(quote(buffer));
    else blocks.push(paragraph(buffer));
    buffer = [];
    mode = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flush();
      blocks.push(heading(headingMatch[1].length, headingMatch[2]));
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flush();
      blocks.push(`<hr style="border:0;border-top:1px solid #deddd6;margin:22px 0;" />`);
      continue;
    }
    const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      if (mode !== "ul") flush();
      mode = "ul";
      buffer.push(bullet[1]);
      continue;
    }
    const ordered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (ordered) {
      if (mode !== "ol") flush();
      mode = "ol";
      buffer.push(ordered[1]);
      continue;
    }
    const quoted = trimmed.match(/^>\s?(.*)$/);
    if (quoted) {
      if (mode !== "quote") flush();
      mode = "quote";
      buffer.push(quoted[1]);
      continue;
    }
    if (mode !== "paragraph") flush();
    mode = "paragraph";
    buffer.push(trimmed);
  }
  flush();

  return blocks.join("");
}

/** Strip Markdown syntax for the text/plain alternative of an email. */
export function markdownToPlainText(markdown: string): string {
  return (markdown ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, alt: string, href: string) => (alt ? `${alt} (${href})` : href))
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, "$1 ($2)")
    .replace(/^\s{0,3}(#{1,6})\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "• ")
    .replace(/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/gm, "—")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
