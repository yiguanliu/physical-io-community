import { describe, expect, it } from "vitest";
import { adminAllowlist, canCreateAdmin, FOUNDING_ADMINS, PENDING_ROLE, roleForNewUser } from "./allowlist";

describe("adminAllowlist", () => {
  it("always includes the founding operator", () => {
    expect(adminAllowlist("")).toEqual(FOUNDING_ADMINS);
    expect(adminAllowlist("ops@physical-io.com")).toEqual([
      "soul@physical-io.com",
      "ops@physical-io.com",
    ]);
  });

  it("grants admin to the first account and founding email afterwards", () => {
    expect(canCreateAdmin("anyone@example.com", 0)).toBe(true);
    expect(canCreateAdmin("soul@physical-io.com", 3)).toBe(true);
    expect(canCreateAdmin("stranger@example.com", 1)).toBe(false);
    expect(canCreateAdmin("ops@physical-io.com", 1, "ops@physical-io.com")).toBe(true);
  });

  it("marks non-allowlisted signups as pending once an admin exists", () => {
    expect(roleForNewUser("soul@physical-io.com", 1)).toBe("admin");
    expect(roleForNewUser("stranger@example.com", 1)).toBe(PENDING_ROLE);
  });
});
