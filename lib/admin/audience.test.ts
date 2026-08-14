import { describe, expect, it } from "vitest";
import { SIGNUP_RESPONSES_CSV } from "../db/fixtures/signup-responses";
import {
  extractKnownOptions,
  isEligibleForCampaign,
  KNOWN_WORK_AREAS,
  mergeMemberRows,
  normalizeEmail,
  parseFlexibleDate,
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

  it("restricts campaigns to selected member ids before sending", () => {
    const people = [
      member(),
      member({ id: "2", email: "selected@example.com", fullName: "Selected Member" }),
      member({ id: "3", email: "other@example.com", fullName: "Other Member", emailStatus: "bounced" }),
    ];
    const result = resolveAudience(people, {
      campaignType: "newsletter",
      memberIds: ["2"],
      requireConsent: true,
    });
    expect(result.eligible.map((item) => item.email)).toEqual(["selected@example.com"]);
    expect(result.skipped).toEqual([]);
    expect(isEligibleForCampaign(people[0], { memberIds: ["2"] })).toBe(false);
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
    expect(parsed.rows[0].signedUpAt).toBe("2026-06-29T00:00:00.000Z");
    expect(parsed.errors[0]).toContain("invalid email");
  });

  it("maps the live Google Form export, keeps US timestamps, and merges duplicate emails", () => {
    const parsed = parseMemberCsv(SIGNUP_RESPONSES_CSV);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(99);

    const anthony = parsed.rows.find((row) => row.email === "anthony.liu218@gmail.com");
    expect(anthony).toMatchObject({
      fullName: "Anthony Liu",
      city: "London",
      professionalRole: "Engineer / Developer",
      experienceRange: "Less than a year",
      interests: ["AI/ML Training"],
      communityGoals: ["Meeting collaborators / co-founders", "Learning from talks & demos"],
      eventFormats: ["In-person meetups & demos", "Talks / panels"],
    });
    expect(anthony?.signedUpAt).toBe("2026-06-28T23:38:39.000Z");

    const calvin = parsed.rows.find((row) => row.email === "10027811@network.rca.ac.uk");
    expect(calvin?.interests).toEqual(["I'm new to this industry, just here to learn.", "Industrial Design"]);
    expect(calvin?.interests).not.toContain("just here to learn.");

    const duplicates = parsed.rows.filter((row) => row.email === "changjin.kweon@aaschool.ac.uk");
    expect(duplicates).toHaveLength(1);
  });

  it("keeps the earliest signup and merges later answers for the same email", () => {
    const merged = mergeMemberRows([
      {
        email: "ada@example.com",
        fullName: "Ada",
        city: "London",
        professionalRole: "Engineer",
        experienceRange: "1-3 years",
        websiteUrl: "",
        linkedinUrl: "",
        interests: ["Research"],
        communityGoals: ["Learning from talks & demos"],
        eventFormats: ["Talks / panels"],
        suggestions: "Demos",
        signedUpAt: "2026-06-29T12:00:00.000Z",
        sourceRow: "2",
      },
      {
        email: "ada@example.com",
        fullName: "Ada Lovelace",
        city: "London",
        professionalRole: "Engineer",
        experienceRange: "1-3 years",
        websiteUrl: "https://ada.dev",
        linkedinUrl: "",
        interests: ["UI/UX"],
        communityGoals: ["Hiring or finding work"],
        eventFormats: ["Hands-on workshops"],
        suggestions: "Workshops",
        signedUpAt: "2026-07-01T09:00:00.000Z",
        sourceRow: "9",
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      fullName: "Ada Lovelace",
      websiteUrl: "https://ada.dev",
      signedUpAt: "2026-06-29T12:00:00.000Z",
      interests: ["Research", "UI/UX"],
      suggestions: "Demos\nWorkshops",
    });
  });

  it("parses Google Sheets US dates and day-first UK dates", () => {
    expect(parseFlexibleDate("6/28/2026 23:38:39")).toBe("2026-06-28T23:38:39.000Z");
    expect(parseFlexibleDate("29/06/2026")).toBe("2026-06-29T00:00:00.000Z");
  });

  it("keeps known multi-select options that contain commas", () => {
    expect(
      extractKnownOptions("Industrial Design, I'm new to this industry, just here to learn.", KNOWN_WORK_AREAS),
    ).toEqual(["I'm new to this industry, just here to learn.", "Industrial Design"]);
  });
});
