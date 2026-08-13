import { describe, expect, it } from "vitest";
import { labelForPath, parentPath } from "./nav";

describe("breadcrumb back target", () => {
  it("goes from a record up to its section", () => {
    expect(parentPath("/admin/campaigns/abc123")).toBe("/admin/campaigns");
    expect(parentPath("/admin/members/abc123")).toBe("/admin/members");
    expect(parentPath("/admin/members/new")).toBe("/admin/members");
  });

  it("goes from a section up to the workspace root", () => {
    expect(parentPath("/admin/campaigns")).toBe("/admin");
    expect(parentPath("/admin/events")).toBe("/admin");
  });

  it("has nowhere to go from the workspace root", () => {
    expect(parentPath("/admin")).toBeNull();
  });

  it("ignores a trailing slash", () => {
    expect(parentPath("/admin/campaigns/")).toBe("/admin");
  });

  it("names the destination for the back label", () => {
    expect(labelForPath("/admin/campaigns")).toBe("Communications");
    expect(labelForPath("/admin/members")).toBe("Members");
    expect(labelForPath("/admin")).toBe("Overview");
  });
});
