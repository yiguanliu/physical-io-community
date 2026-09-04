import { describe, expect, it } from "vitest";
import { readyPlatforms } from "./config";

describe("content approval readiness", () => {
  it("rejects an item whose variants are all drafts", () => {
    expect(
      readyPlatforms([
        { platform: "instagram", status: "draft" },
        { platform: "email", status: "draft" },
      ]),
    ).toEqual([]);
  });

  it("includes ready and already-published variants in platform order", () => {
    expect(
      readyPlatforms([
        { platform: "email", status: "ready" },
        { platform: "instagram", status: "published" },
        { platform: "linkedin", status: "draft" },
      ]),
    ).toEqual(["instagram", "email"]);
  });
});
