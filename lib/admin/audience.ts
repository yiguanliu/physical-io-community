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

export const INTEREST_KIND = {
  workArea: "work_area",
  communityGoal: "community_goal",
  eventFormat: "event_format",
} as const;

export const KNOWN_WORK_AREAS = [
  "I'm new to this industry, just here to learn.",
  "Software Development",
  "Electrical Engineering",
  "Operation Management",
  "Industrial Design",
  "AI/ML Training",
  "Manufacturing",
  "Distribution",
  "Policy Making",
  "Investment",
  "Marketing",
  "Research",
  "UI/UX",
  "HR",
] as const;

export const KNOWN_COMMUNITY_GOALS = [
  "Meeting collaborators / co-founders",
  "Showcasing what I'm building",
  "Learning from talks & demos",
  "Staying on top of the field",
  "Hiring or finding work",
] as const;

export const KNOWN_EVENT_FORMATS = [
  "In-person meetups & demos",
  "Online (Discord / Slack)",
  "Socials & networking",
  "Hands-on workshops",
  "Talks / panels",
] as const;

export type InterestKind = (typeof INTEREST_KIND)[keyof typeof INTEREST_KIND];

function normalizeHeader(header: string) {
  return header
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapCsvHeader(header: string): string {
  const normalized = normalizeHeader(header);
  const exact = CSV_HEADER_ALIASES[normalized];
  if (exact) return exact;
  const rules: Array<[string, string]> = [
    ["timestamp", "signedUpAt"],
    ["full name", "fullName"],
    ["email address", "email"],
    ["which city", "city"],
    ["what best describes you", "professionalRole"],
    ["how many years", "experienceRange"],
    ["what are you working on", "interests"],
    ["physical ai", "interests"],
    ["company portfolio github", "websiteUrl"],
    ["website link", "websiteUrl"],
    ["linedkin", "linkedinUrl"],
    ["linkedin", "linkedinUrl"],
    ["what do you most want", "communityGoals"],
    ["what format would you actually show up", "eventFormats"],
    ["anything youd love to see", "suggestions"],
  ];
  for (const [needle, field] of rules) {
    if (normalized === needle || normalized.includes(needle)) return field;
  }
  return header;
}

export function splitFormList(value: string) {
  return value
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractKnownOptions(value: string, known: readonly string[]): string[] {
  if (!value.trim()) return [];
  let rest = value;
  const found: string[] = [];
  for (const option of [...known].sort((left, right) => right.length - left.length)) {
    const escaped = option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    if (pattern.test(rest)) {
      found.push(option);
      rest = rest.replace(pattern, " ");
    }
  }
  const leftover = rest.replace(/^[\s,;|/]+|[\s,;|/]+$/g, "").trim();
  if (leftover) found.push(...splitFormList(leftover));
  return found;
}

export function normalizeCity(value: string) {
  const city = value.replace(/\s+/g, " ").trim();
  if (city.toLowerCase() === "london") return "London";
  return city;
}

export type ParsedMemberRow = {
  email: string;
  fullName: string;
  city: string;
  professionalRole: string;
  experienceRange: string;
  websiteUrl: string;
  linkedinUrl: string;
  interests: string[];
  communityGoals: string[];
  eventFormats: string[];
  suggestions: string;
  signedUpAt: string;
  sourceRow?: string;
};

export function parseFlexibleDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return new Date().toISOString();
  const withTime = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (withTime) {
    const first = Number(withTime[1]);
    const second = Number(withTime[2]);
    const year = Number(withTime[3]);
    const hour = Number(withTime[4] ?? "0");
    const minute = Number(withTime[5] ?? "0");
    const seconds = Number(withTime[6] ?? "0");
    const dayFirst = first > 12 && second <= 12;
    const month = dayFirst ? second : first;
    const day = dayFirst ? first : second;
    const parsed = Date.UTC(year, month - 1, day, hour, minute, seconds);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  const direct = Date.parse(trimmed);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();
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

export function mergeMemberRows(rows: ParsedMemberRow[]): ParsedMemberRow[] {
  const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  const byEmail = new Map<string, ParsedMemberRow>();
  for (const row of rows) {
    const existing = byEmail.get(row.email);
    if (!existing) {
      byEmail.set(row.email, { ...row, interests: unique(row.interests), communityGoals: unique(row.communityGoals), eventFormats: unique(row.eventFormats) });
      continue;
    }
    const [earlier, later] = existing.signedUpAt <= row.signedUpAt ? [existing, row] : [row, existing];
    byEmail.set(row.email, {
      ...earlier,
      fullName: later.fullName || earlier.fullName,
      city: later.city || earlier.city,
      professionalRole: later.professionalRole || earlier.professionalRole,
      experienceRange: later.experienceRange || earlier.experienceRange,
      websiteUrl: later.websiteUrl || earlier.websiteUrl,
      linkedinUrl: later.linkedinUrl || earlier.linkedinUrl,
      interests: unique([...earlier.interests, ...later.interests]),
      communityGoals: unique([...earlier.communityGoals, ...later.communityGoals]),
      eventFormats: unique([...earlier.eventFormats, ...later.eventFormats]),
      suggestions: [earlier.suggestions, later.suggestions].filter(Boolean).join("\n"),
      sourceRow: [earlier.sourceRow, later.sourceRow].filter(Boolean).join(","),
    });
  }
  return [...byEmail.values()].sort((left, right) => left.signedUpAt.localeCompare(right.signedUpAt));
}

export function parseMemberCsv(text: string): { rows: ParsedMemberRow[]; errors: string[] } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], errors: ["CSV must include a header row and at least one member."] };
  const headers = table[0].map((header) => mapCsvHeader(header));
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
    rows.push({
      email,
      fullName,
      city: normalizeCity(read("city")),
      professionalRole: read("professionalRole"),
      experienceRange: read("experienceRange"),
      websiteUrl: read("websiteUrl"),
      linkedinUrl: read("linkedinUrl"),
      interests: extractKnownOptions(read("interests"), KNOWN_WORK_AREAS),
      communityGoals: extractKnownOptions(read("communityGoals"), KNOWN_COMMUNITY_GOALS),
      eventFormats: extractKnownOptions(read("eventFormats"), KNOWN_EVENT_FORMATS),
      suggestions: read("suggestions"),
      signedUpAt: parseFlexibleDate(read("signedUpAt")),
      sourceRow: String(index + 2),
    });
  });
  return { rows: mergeMemberRows(rows), errors };
}
