import { physicalIOBrand, themeColors } from "../../workspace-ui/src/theme";

// Email clients require inline styles and system-font fallbacks, not app CSS.
export const emailTheme = {
  font: physicalIOBrand.fontFamily,
  accent: physicalIOBrand.accent,
  link: themeColors(physicalIOBrand.accent).action,
  ink: "#171717",
  muted: "#666666",
  line: "#e3e3e3",
  canvas: "#eaeaea",
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
    .map(block => `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${t.ink};">${block.replaceAll("\n", "<br/>")}</p>`).join("");
  const unsubscribe = input.unsubscribeUrl
    ? `<p style="margin:12px 0 0;">You can <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${t.link};text-decoration:underline;">unsubscribe from these emails</a> at any time.</p>` : "";
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.previewText ?? "Physical I/O")}</title></head>
<body style="margin:0;padding:0;background:${t.canvas};font-family:${escapeHtml(t.font)};color:${t.ink};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.previewText ?? "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.canvas};"><tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:4px solid ${t.accent};">
<tr><td style="padding:32px 24px 24px;background:#171717;">
<a href="https://www.physical-io.com/" style="text-decoration:none;"><img src="https://www.physical-io.com/assets/physical-io-wordmark.png" width="176" alt="Physical I/O" style="display:block;width:176px;max-width:100%;height:auto;border:0;"></a>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;letter-spacing:1px;color:#cccccc;">AI IN THE PHYSICAL WORLD</p>
</td></tr>
<tr><td style="padding:32px 24px 24px;font-family:${escapeHtml(t.font)};">${body}</td></tr>
<tr><td style="padding:24px;border-top:1px solid ${t.line};font-size:12px;line-height:1.6;color:${t.muted};">
<p style="margin:0;font-weight:700;color:${t.ink};">Physical I/O · London</p>
<p style="margin:8px 0 0;"><a href="https://www.physical-io.com/" style="color:${t.link};text-decoration:underline;">Explore the community</a></p>
${unsubscribe}
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
}
