import { describe, expect, it } from "vitest";
import {
  isEligibleForCampaign,
  normalizeEmail,
  parseMemberCsv,
  personalise,
  resolveAudience,
  skipReasonForMember,
  type AudienceMember,
} from "./audience";

const member = (overrides: Partial<AudienceMember> = {}): AudienceMember => ({
  id: "1",
  email: "ava@example.com",
  fullName: "Ava Oppenheimer",
  firstName: "Ava",
  city: "London",
  professionalRole: "Founder / Operator",
  status: "active",
  emailStatus: "ok",
  interests: ["Robotics"],
  subscriptions: [{ topic: "newsletter", status: "subscribed" }],
  ...overrides,
});

describe("audience eligibility", () => {
  it("normalizes emails", () => {
    expect(normalizeEmail("  Ava@Example.com ")).toBe("ava@example.com");
  });

  it("excludes members without newsletter consent", () => {
    const unknown = member({ subscriptions: [{ topic: "newsletter", status: "consent_unknown" }] });
    expect(skipReasonForMember(unknown, { campaignType: "newsletter", requireConsent: true })).toBe("missing_consent");
    expect(isEligibleForCampaign(unknown, { campaignType: "newsletter", requireConsent: true })).toBe(false);
  });

  it("includes subscribed members and skips archived or bounced ones", () => {
    const people = [
      member(),
      member({ id: "2", status: "archived", email: "old@example.com" }),
      member({ id: "3", emailStatus: "bounced", email: "bounce@example.com" }),
    ];
    const result = resolveAudience(people, { campaignType: "newsletter", requireConsent: true });
    expect(result.eligible.map((item) => item.email)).toEqual(["ava@example.com"]);
    expect(result.skipped.map((item) => item.reason)).toEqual(["archived", "bounced"]);
  });

  it("personalises first names", () => {
    expect(personalise("Hi {{first_name}}", member())).toBe("Hi Ava");
  });
});

describe("member CSV import", () => {
  it("maps Google Form headers and rejects invalid emails", () => {
    const csv = `Timestamp,Full name,Email address,City,Professional role,Physical AI / Spatial Intelligence work areas
29/06/2026,Ava Oppenheimer,ava@tryito.io,London,Founder,"Robotics, AI/ML"
29/06/2026,Bad Row,not-an-email,London,Designer,Robotics`;
    const parsed = parseMemberCsv(csv);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      email: "ava@tryito.io",
      fullName: "Ava Oppenheimer",
      city: "London",
      interests: ["Robotics", "AI/ML"],
    });
    expect(parsed.errors[0]).toContain("invalid email");
  });
});
