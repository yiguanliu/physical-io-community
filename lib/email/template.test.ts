import { describe, expect, it } from "vitest";
import { renderEmailHtml } from "./template";

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
