export const EMAIL_TOPICS = ["newsletter", "events", "announcements"] as const;
export type EmailTopic = (typeof EMAIL_TOPICS)[number];

export const CAMPAIGN_TYPES = ["newsletter", "event_update", "announcement"] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const MEMBER_STATUSES = ["active", "review", "paused", "archived"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const LEAD_STATUSES = ["research", "contacted", "meeting", "proposal", "agreement", "won", "lost", "nurture"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type AudienceFilter = {
  campaignType?: CampaignType;
  statuses?: string[];
  cities?: string[];
  roles?: string[];
  interests?: string[];
  requireConsent?: boolean;
};

export type AudienceMember = {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  city: string;
  professionalRole: string;
  status: string;
  emailStatus: string;
  interests: string[];
  subscriptions: Array<{ topic: string; status: string }>;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function firstNameFrom(fullName: string) {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName.trim();
}

export function campaignTypeToTopic(type: string): EmailTopic {
  if (type === "event_update") return "events";
  if (type === "announcement") return "announcements";
  return "newsletter";
}

export function parseAudienceFilter(raw: string | AudienceFilter | null | undefined): AudienceFilter {
  if (!raw) return {};
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw) as AudienceFilter;
  } catch {
    return {};
  }
}

export function skipReasonForMember(member: AudienceMember, filter: AudienceFilter): string | null {
  if (member.status === "archived") return "archived";
  if (member.emailStatus === "unsubscribed") return "unsubscribed";
  if (member.emailStatus === "bounced") return "bounced";
  if (member.emailStatus === "complained") return "complained";
  if (filter.statuses?.length && !filter.statuses.includes(member.status)) return "status_filter";
  if (filter.cities?.length && !filter.cities.includes(member.city)) return "city_filter";
  if (filter.roles?.length && !filter.roles.includes(member.professionalRole)) return "role_filter";
  if (filter.interests?.length && !filter.interests.some((interest) => member.interests.includes(interest))) {
    return "interest_filter";
  }
  const requireConsent = filter.requireConsent !== false;
  if (requireConsent) {
    const topic = campaignTypeToTopic(filter.campaignType ?? "newsletter");
    const subscription = member.subscriptions.find((item) => item.topic === topic);
    if (!subscription || subscription.status !== "subscribed") return "missing_consent";
  }
  return null;
}

export function isEligibleForCampaign(member: AudienceMember, filter: AudienceFilter) {
  return skipReasonForMember(member, filter) === null;
}

export function resolveAudience(members: AudienceMember[], filter: AudienceFilter) {
  const eligible: AudienceMember[] = [];
  const skipped: Array<{ member: AudienceMember; reason: string }> = [];
  for (const member of members) {
    const reason = skipReasonForMember(member, filter);
    if (reason) skipped.push({ member, reason });
    else eligible.push(member);
  }
  return { eligible, skipped };
}

export function personalise(template: string, member: { firstName: string; fullName: string; email: string; city: string }) {
  return template
    .replaceAll("{{first_name}}", member.firstName || "there")
    .replaceAll("{{full_name}}", member.fullName)
    .replaceAll("{{email}}", member.email)
    .replaceAll("{{city}}", member.city || "your city");
}

export const CSV_HEADER_ALIASES: Record<string, string> = {
  timestamp: "signedUpAt",
  "full name": "fullName",
  "email address": "email",
  email: "email",
  city: "city",
  "professional role": "professionalRole",
  "industry experience": "experienceRange",
  "physical ai / spatial intelligence work areas": "interests",
  "work areas": "interests",
  interests: "interests",
  "company, portfolio, or github link": "websiteUrl",
  "company / portfolio / github": "websiteUrl",
  website: "websiteUrl",
  "linkedin link": "linkedinUrl",
  linkedin: "linkedinUrl",
};

export type ParsedMemberRow = {
  email: string;
  fullName: string;
  city: string;
  professionalRole: string;
  experienceRange: string;
  websiteUrl: string;
  linkedinUrl: string;
  interests: string[];
  signedUpAt: string;
  sourceRow?: string;
};

export function parseFlexibleDate(value: string) {
  if (!value.trim()) return new Date().toISOString();
  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();
  const uk = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (uk) {
    const iso = `${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`;
    const parsed = Date.parse(iso);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export function parseMemberCsv(text: string): { rows: ParsedMemberRow[]; errors: string[] } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], errors: ["CSV must include a header row and at least one member."] };
  const headers = table[0].map((header) => CSV_HEADER_ALIASES[header.toLowerCase()] ?? header);
  const emailIndex = headers.indexOf("email");
  const nameIndex = headers.indexOf("fullName");
  if (emailIndex < 0 || nameIndex < 0) {
    return { rows: [], errors: ["CSV must include Full name and Email address columns."] };
  }
  const rows: ParsedMemberRow[] = [];
  const errors: string[] = [];
  table.slice(1).forEach((values, index) => {
    const read = (key: string) => {
      const column = headers.indexOf(key);
      return column >= 0 ? (values[column] ?? "").trim() : "";
    };
    const email = normalizeEmail(read("email"));
    const fullName = read("fullName");
    if (!email || !email.includes("@")) {
      errors.push(`Row ${index + 2}: invalid email`);
      return;
    }
    if (!fullName) {
      errors.push(`Row ${index + 2}: missing name`);
      return;
    }
    const interests = read("interests")
      .split(/[,;|]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const signedUpAtRaw = read("signedUpAt");
    const signedUpAt = parseFlexibleDate(signedUpAtRaw);
    rows.push({
      email,
      fullName,
      city: read("city"),
      professionalRole: read("professionalRole"),
      experienceRange: read("experienceRange"),
      websiteUrl: read("websiteUrl"),
      linkedinUrl: read("linkedinUrl"),
      interests,
      signedUpAt,
      sourceRow: String(index + 2),
    });
  });
  return { rows, errors };
}
