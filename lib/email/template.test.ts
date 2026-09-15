import { describe, expect, it } from "vitest";
import { renderEmailHtml, renderEmailLink } from "./template";

describe("branded newsletter template", () => {
  it("escapes plain content, preview and unsubscribe attributes", () => {
    const html = renderEmailHtml({ body: '<script>alert("x")</script>', previewText: '<img>', unsubscribeUrl: 'https://example.com/?a=1&b="value"' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img&gt;');
    expect(html).toContain('a=1&amp;b=&quot;value&quot;');
  });
  it("preserves rendered content and makes the email fluid with a readable brand fallback", () => {
    const html = renderEmailHtml({ body: 'Fallback', bodyHtml: '<h1>News</h1>' });
    expect(html).toContain('<h1>News</h1>');
    expect(html).toContain('max-width:600px');
    expect(html).toContain('alt="Physical I/O"');
    expect(html).not.toContain('unsubscribe from');
  });
});

it("renders escaped underlined links", () => {
  const html = renderEmailLink("Watch <episode>", "https://example.com/?a=1&b=2");
  expect(html).toContain("text-decoration:underline");
  expect(html).not.toContain("border-radius");
  expect(html).toContain("Watch &lt;episode&gt;");
  expect(html).toContain("a=1&amp;b=2");
  expect(renderEmailLink("Unsafe", "javascript:alert(1)")).toBe("Unsafe");
});

it("adapts live text and backgrounds together while retaining email-client fallbacks", () => {
  const html = renderEmailHtml({ body: "Welcome", unsubscribeUrl: "https://example.com/unsubscribe" });
  expect(html).toContain('name="color-scheme" content="light dark"');
  expect(html).toContain('@media (prefers-color-scheme: dark)');
  expect(html).toContain('[data-ogsc] .email-content');
  expect(html).toContain('background:#000000!important;color:#ffffff!important');
  expect(html).toContain('color:#111111;');
  expect(html).toContain('color:#555555;');
  expect(html).toContain('class="email-content email-rule"');
  expect(html).toContain('class="email-footer email-rule"');
  expect(html).toContain('unsubscribe from these emails');
  expect(html).not.toMatch(/#EF2900|#ffd5cc|#f7785e/i);
});
