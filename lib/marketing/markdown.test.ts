import { describe, expect, it } from "vitest";
import { markdownToHtml, markdownToPlainText } from "./markdown";

describe("newsletter Markdown rendering", () => {
  it("renders the editor's common Markdown blocks instead of exposing raw syntax", () => {
    const markdown = [
      "## Physical AI update",
      "",
      "A **working prototype** is [live](https://example.com/demo).",
      "",
      "- Fast",
      "- Useful",
      "",
      "![Robot prototype](https://example.com/robot.png)",
    ].join("\n");

    const html = markdownToHtml(markdown);
    expect(html).toContain("<h2");
    expect(html).toContain("<strong>working prototype</strong>");
    expect(html).toContain('<a href="https://example.com/demo"');
    expect(html).toContain("<ul");
    expect(html).toContain('<img src="https://example.com/robot.png" alt="Robot prototype"');
    expect(html).not.toContain("## Physical");
  });

  it("escapes HTML and does not link unsafe URL schemes", () => {
    const html = markdownToHtml('<script>alert("x")</script> [click](javascript:alert(1))');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
  });

  it("creates a readable plain-text alternative", () => {
    expect(markdownToPlainText("# Heading\n\n**Bold** and [source](https://example.com)")).toBe(
      "Heading\n\nBold and source (https://example.com)",
    );
  });
});
