// Email clients require inline styles and system-font fallbacks, not app CSS.
export const emailTheme = {
  font: '"Manrope", Arial, Helvetica, sans-serif',
  headingFont: '"Manrope", Arial, Helvetica, sans-serif',
  accent: "#000000",
  link: "#111111",
  ink: "#111111",
  muted: "#555555",
  line: "#dddddd",
  canvas: "#ffffff",
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
  return `<p style="margin:0 0 24px;font-family:${escapeHtml(emailTheme.font)};font-size:16px;line-height:1.5;"><a href="${escapeHtml(href)}" style="color:${emailTheme.ink};text-decoration:underline;text-underline-offset:3px;">${escapeHtml(label)}</a></p>`;
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
    .map(block => `<p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:${t.ink};">${block.replaceAll("\n", "<br/>")}</p>`).join("");
  const unsubscribe = input.unsubscribeUrl
    ? `<p style="margin:12px 0 0;font-size:13px;">You can <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${t.muted};text-decoration:underline;">unsubscribe from these emails</a> at any time.</p>` : "";
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.previewText ?? "Physical I/O")}</title>
<!--[if !mso]><!--><style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
@media (prefers-color-scheme: dark){
 .email-canvas{background:#000000!important;color:#ffffff!important;}
 .email-content,.email-content *{color:#ffffff!important;border-color:#444444!important;}
 .email-content code{background:#222222!important;}
 .email-footer,.email-footer *{color:#bdbdbd!important;}
 .email-rule{border-color:#444444!important;}
}
[data-ogsc] .email-canvas{background:#000000!important;color:#ffffff!important;}
[data-ogsc] .email-content,[data-ogsc] .email-content *{color:#ffffff!important;border-color:#444444!important;}
[data-ogsc] .email-content code{background:#222222!important;}
[data-ogsc] .email-footer,[data-ogsc] .email-footer *{color:#bdbdbd!important;}
[data-ogsc] .email-rule{border-color:#444444!important;}
@font-face{font-family:Manrope;font-style:normal;font-weight:200 800;font-display:swap;src:url('https://www.physical-io.com/fonts/manrope/Manrope-Variable.ttf') format('truetype');}</style><!--<![endif]-->
</head>
<body class="email-canvas" style="margin:0;padding:0;background:${t.canvas};font-family:${escapeHtml(t.font)};color:${t.ink};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.previewText ?? "")}</div>
<table class="email-canvas" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.canvas};"><tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table class="email-canvas" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${t.canvas};">
<tr><td style="padding:0;background:${t.accent};"><img src="https://www.physical-io.com/assets/email/physical-io-banner.png" width="600" alt="Physical I/O" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
<tr><td class="email-content email-rule" style="color:${t.ink};padding:32px 24px 24px;border-top:1px solid ${t.line};font-family:${escapeHtml(t.font)};">${body}</td></tr>
<tr><td class="email-rule" style="background:#000000;padding:0;border-top:1px solid ${t.line};"><img src="https://www.physical-io.com/assets/email/physical-io-footer.png" width="600" alt="Love, Mind + Body. A community led by curiosity, design and engineering." style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
<tr><td class="email-footer email-rule" align="center" style="text-align:center;padding:24px 24px 32px;border-top:1px solid ${t.line};font-family:${escapeHtml(t.font)};font-size:13px;line-height:1.6;color:${t.muted};">
<p style="margin:0 0 16px;font-weight:400;color:${t.muted};">Physical I/O · London</p>
${unsubscribe}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
}
