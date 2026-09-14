import { LINKEDIN_URL, INSTAGRAM_URL, X_URL, YOUTUBE_URL } from "../site";
import { physicalIOBrand, themeColors } from "../../workspace-ui/src/theme";

// Email clients require inline styles and system-font fallbacks, not app CSS.
export const emailTheme = {
  font: '"Rokkitt", "American Typewriter", "Courier New", serif',
  headingFont: '"Rokkitt", "American Typewriter", "Courier New", serif',
  accent: physicalIOBrand.accent,
  link: themeColors(physicalIOBrand.accent).action,
  ink: "#ffffff",
  muted: "#ffffff",
  line: "#f7785e",
  canvas: "#EF2900",
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Underlined editorial links keep the email feeling like a typed letter. */
export function renderEmailLink(label: string, href: string) {
  if (!/^(https?:\/\/|mailto:)/i.test(href.trim())) return escapeHtml(label);
  return `<p style="margin:0 0 24px;font-family:${escapeHtml(emailTheme.font)};font-size:20px;line-height:1.5;"><a href="${escapeHtml(href)}" style="color:${emailTheme.ink};text-decoration:underline;text-underline-offset:3px;">${escapeHtml(label)}</a></p>`;
}

export function renderEmailHtml(input: {
  previewText?: string;
  body: string;
  /** Trusted, escaped markup from the Markdown renderer. */
  bodyHtml?: string;
  unsubscribeUrl?: string;
}) {
  const t = emailTheme;
  const body = input.bodyHtml ?? escapeHtml(input.body).split(/\n{2,}/)
    .map(block => `<p style="margin:0 0 24px;font-size:20px;line-height:1.5;color:${t.ink};">${block.replaceAll("\n", "<br/>")}</p>`).join("");
  const unsubscribe = input.unsubscribeUrl
    ? `<p style="margin:12px 0 0;font-size:13px;">You can <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#ffd5cc;text-decoration:underline;">unsubscribe from these emails</a> at any time.</p>` : "";
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.previewText ?? "Physical I/O")}</title>
<!--[if !mso]><!--><style>@font-face{font-family:Rokkitt;font-style:normal;font-weight:400;font-display:swap;src:url('https://www.physical-io.com/fonts/rokkitt/rokkitt-regular.ttf') format('truetype');}</style><!--<![endif]-->
</head>
<body style="margin:0;padding:0;background:${t.canvas};font-family:${escapeHtml(t.font)};color:${t.ink};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.previewText ?? "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.canvas};"><tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${t.canvas};">
<tr><td style="padding:0;background:${t.accent};"><a href="https://www.physical-io.com/" style="text-decoration:none;"><img src="https://www.physical-io.com/assets/email/physical-io-banner.png" width="600" alt="Physical I/O" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a></td></tr>
<tr><td style="padding:32px 24px 24px;border-top:1px solid ${t.line};font-family:${escapeHtml(t.font)};">${body}</td></tr>
<tr><td style="padding:0;border-top:1px solid ${t.line};"><a href="https://www.physical-io.com/" style="text-decoration:none;"><img src="https://www.physical-io.com/assets/email/physical-io-footer.png" width="600" alt="Love, Intelligence + Body. A community led by curiosity, design and engineering." style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a></td></tr>
<tr><td align="center" style="text-align:center;padding:24px 24px 32px;border-top:1px solid ${t.line};font-family:${escapeHtml(t.font)};font-size:13px;line-height:1.6;color:#ffd5cc;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;margin:0 0 24px;"><tr>${[["LinkedIn", LINKEDIN_URL], ["Instagram", INSTAGRAM_URL], ["YouTube", YOUTUBE_URL], ["X", X_URL]].map(([label, href]) => `<td width="25%" align="center" style="text-align:center;font-family:${escapeHtml(t.font)};font-size:13px;line-height:1.6;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:8px 0;color:#ffd5cc;text-decoration:underline;white-space:nowrap;">${label}</a></td>`).join('')}</tr></table>
<p style="margin:0 0 16px;font-weight:400;color:#ffd5cc;">Physical I/O · London</p>
<p style="margin:0 0 16px;font-size:14px;"><a href="https://www.physical-io.com/" style="color:#ffd5cc;text-decoration:underline;">Explore the community</a></p>
${unsubscribe}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
}
