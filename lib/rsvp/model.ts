import { parseCsv } from '../admin/audience';

export const ATTENDEE_CATEGORIES = ['Designer', 'Engineer', 'Marketer', 'Investor', 'Founder', 'Operator', 'Other'] as const;
export type AttendeeCategory = (typeof ATTENDEE_CATEGORIES)[number];
export const ATTENDANCE = ['in_person', 'online', 'not_going'] as const;
export type Attendance = (typeof ATTENDANCE)[number];
export const ATTENDANCE_LABEL: Record<Attendance, string> = { in_person: 'In person', online: 'Online', not_going: 'Not going' };

// Ordered: the first match wins, so "Co-founder & CTO" reads as Founder.
const CATEGORY_PATTERNS: [AttendeeCategory, RegExp][] = [
  ['Investor', /invest|venture|\bvc\b|angel|capital|\bfund|partner at/i],
  ['Founder', /founder|\bceo\b|\bowner\b/i],
  ['Designer', /design|\bux\b|\bui\b|creative|architect/i],
  ['Marketer', /market|growth|brand|\bcomms\b|communications|content|social media|\bpr\b/i],
  ['Engineer', /engineer|developer|scientist|software|\bml\b|machine learning|roboticist|\bcto\b|programmer/i],
  ['Operator', /operat|\bops\b|\bcoo\b|product manager|programme|program manager|project manager|strategy|business|consult|director|head of|manager/i],
];
/** Suggests a badge category from a free-text Luma job title. Unknown titles stay unselected. */
export function guessCategory(jobTitle: string): AttendeeCategory | '' {
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(jobTitle))?.[0] ?? '';
}

export function slugify(value: string, max = 40) {
  const slug = value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/g, '');
  return slug || 'guest';
}

const SUFFIX_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
/** Name first for readability; a short random suffix stops ticket URLs being guessed from names. */
export function ticketSlug(name: string, random: (size: number) => Uint8Array = size => crypto.getRandomValues(new Uint8Array(size))) {
  const suffix = Array.from(random(4), byte => SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length]).join('');
  return `${slugify(name)}-${suffix}`;
}
/** Human-readable check-in code printed under the barcode, e.g. 02-7K2F. */
export function ticketCode(episodeNumber: string, slug: string) {
  return `${episodeNumber}-${slug.slice(slug.lastIndexOf('-') + 1).toUpperCase()}`;
}

export function normalizeLinkedin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!(url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com')) || url.username || url.password) return '';
    url.protocol = 'https:';
    url.search = '';
    url.hash = '';
    return url.href.replace(/\/$/, '');
  } catch { return ''; }
}

export type LumaGuest = {
  guestId: string; email: string; fullName: string; firstName: string; lastName: string;
  status: string; registeredAt: string | null; organisation: string; jobTitle: string; linkedin: string; motivation: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Parses a Luma "Guests" CSV export. Custom registration questions are matched by wording. */
export function parseLumaCsv(text: string): { guests: LumaGuest[]; errors: string[] } {
  const [header, ...rows] = parseCsv(text);
  if (!header) return { guests: [], errors: ['The file is empty.'] };
  const names = header.map(h => h.trim().toLowerCase());
  const exact = (name: string) => names.indexOf(name);
  // Custom registration questions only: Luma's own export has tracking columns such as
  // linkedin_click_id and utm_* that would otherwise match first.
  const tracking = /^(utm_|.*_click_id$|.*_id$|qr_code_url$|referr)/;
  const find = (pattern: RegExp) => names.findIndex(name => !tracking.test(name) && pattern.test(name));
  const col = {
    guestId: exact('guest_id'), email: exact('email'), name: exact('name'), first: exact('first_name'), last: exact('last_name'),
    status: exact('approval_status'), created: exact('created_at'),
    organisation: find(/organi[sz]ation|company|affiliat/), jobTitle: find(/job title|your title|your role/),
    linkedin: find(/linkedin/), motivation: find(/want to join|why .*join|makes you want/),
  };
  if (col.email < 0) return { guests: [], errors: ['No email column found. Export the guest list from Luma as CSV.'] };
  const errors: string[] = [];
  const seen = new Set<string>();
  const guests: LumaGuest[] = [];
  rows.forEach((row, index) => {
    const cell = (i: number) => (i >= 0 ? row[i] ?? '' : '').trim();
    const email = cell(col.email).toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) { errors.push(`Row ${index + 2}: missing or invalid email.`); return; }
    if (seen.has(email)) return;
    seen.add(email);
    const first = cell(col.first), last = cell(col.last);
    const fullName = (cell(col.name) || `${first} ${last}`).replace(/\s+/g, ' ').trim().slice(0, 160);
    const created = Date.parse(cell(col.created));
    guests.push({
      guestId: cell(col.guestId).slice(0, 80), email, fullName,
      firstName: (first || fullName.split(' ')[0] || '').slice(0, 160), lastName: (last || fullName.split(' ').slice(1).join(' ')).slice(0, 160),
      status: (cell(col.status) || 'approved').toLowerCase().slice(0, 40),
      registeredAt: Number.isNaN(created) ? null : new Date(created).toISOString(),
      organisation: cell(col.organisation).slice(0, 160), jobTitle: cell(col.jobTitle).slice(0, 160),
      linkedin: normalizeLinkedin(cell(col.linkedin)), motivation: cell(col.motivation).slice(0, 2000),
    });
  });
  return { guests, errors };
}

export type SeatState = { capacity: number; taken: number; left: number; full: boolean };
export function seatState(capacity: number, taken: number): SeatState {
  const left = Math.max(0, capacity - taken);
  return { capacity, taken, left, full: left === 0 };
}

/** Luma approval status → whether this guest may choose an attendance option. */
export function rsvpEligibility(status: string): 'eligible' | 'waitlist' | 'invited' | 'declined' {
  if (status === 'approved') return 'eligible';
  if (status === 'waitlist' || status === 'pending_approval') return 'waitlist';
  if (status === 'invited') return 'invited';
  return 'declined';
}
