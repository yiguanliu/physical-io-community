import 'server-only';
import type { PoolClient } from 'pg';
import { database } from '@/lib/admin/database';
import { findEpisode } from '@/lib/events/catalog';
import { rsvpEligibility, seatState, ticketSlug, type Attendance, type LumaGuest, type SeatState } from './model';

export class RsvpRateLimit extends Error {}
export class SeatsFull extends Error {}
export class RsvpNotAllowed extends Error {}

export type Registration = {
  id: string; eventSlug: string; email: string; fullName: string; firstName: string; lastName: string;
  organisation: string; jobTitle: string; linkedin: string; lumaStatus: string;
  attendance: Attendance | null; category: string; ticketSlug: string | null; memberId: string | null; rsvpAt: string | null;
};
type Row = Record<string, unknown>;
const toRegistration = (r: Row): Registration => ({
  id: String(r.id), eventSlug: String(r.event_slug), email: r.email ? String(r.email) : '', fullName: String(r.full_name), firstName: String(r.first_name), lastName: String(r.last_name),
  organisation: String(r.organisation), jobTitle: String(r.job_title), linkedin: String(r.linkedin_url), lumaStatus: String(r.luma_status),
  attendance: (r.attendance as Attendance | null) ?? null, category: String(r.category ?? ''), ticketSlug: (r.ticket_slug as string | null) ?? null,
  memberId: (r.member_id as string | null) ?? null, rsvpAt: r.rsvp_at ? new Date(r.rsvp_at as string).toISOString() : null,
});
const FIELDS = 'id,event_slug,email,full_name,first_name,last_name,organisation,job_title,linkedin_url,luma_status,attendance,category,ticket_slug,member_id,rsvp_at';

/** Per-event httpOnly cookie that marks the device which completed the RSVP. */
export const ownerCookie = (eventSlug: string) => `pio_rsvp_${eventSlug.replace(/[^a-z0-9]/gi, '_')}`;

// Online joining links stay server-side and are rendered only on online tickets.
// MEET_URL_<EVENT_SLUG> (e.g. MEET_URL_EVENT_02_ROBOTICS) overrides the default.
const MEET_URLS: Record<string, string> = { 'event-02-robotics': 'https://meet.google.com/htd-farv-kpo' };
export function meetUrl(eventSlug: string) {
  const value = process.env[`MEET_URL_${eventSlug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`]?.trim() || MEET_URLS[eventSlug] || '';
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'meet.google.com' ? url.href : null; } catch { return null; }
}

// Shares the join limiter table so the limit holds across server instances.
export async function rateLimit(db: PoolClient, key: string, max = 30) {
  await db.query("delete from private.join_rate_limits where started_at<now()-interval '1 day'");
  const result = await db.query("insert into private.join_rate_limits(key) values($1) on conflict(key) do update set attempts=case when join_rate_limits.started_at<now()-interval '1 hour' then 1 else join_rate_limits.attempts+1 end, started_at=case when join_rate_limits.started_at<now()-interval '1 hour' then now() else join_rate_limits.started_at end returning attempts", [key]);
  if (result.rows[0].attempts > max) throw new RsvpRateLimit();
}

export async function seats(db: Pick<PoolClient, 'query'>, eventSlug: string, lock = false): Promise<SeatState | null> {
  const settings = await db.query(`select in_person_capacity from public.event_settings where event_slug=$1${lock ? ' for update' : ''}`, [eventSlug]);
  if (!settings.rowCount) return null;
  const taken = await db.query("select count(*)::int n from public.event_registrations where event_slug=$1 and attendance='in_person'", [eventSlug]);
  return seatState(settings.rows[0].in_person_capacity, taken.rows[0].n);
}
export async function publicSeats(eventSlug: string) {
  try { return await seats(database(), eventSlug); } catch { console.error('Event seats unavailable'); return null; }
}

export async function findRegistration(db: Pick<PoolClient, 'query'>, eventSlug: string, email: string) {
  // Prefill LinkedIn from the member record when the Luma answer is empty.
  const result = await db.query(
    `select ${FIELDS.replace('linkedin_url', `coalesce(nullif(r.linkedin_url,''),(select m.linkedin_url from public.members m where m.email_normalized=r.email_normalized),'') linkedin_url`)}
     from public.event_registrations r where event_slug=$1 and email_normalized=$2`,
    [eventSlug, email.trim().toLowerCase()],
  );
  return result.rows[0] ? toRegistration(result.rows[0]) : null;
}

export type RsvpInput = { eventSlug: string; email: string; attendance: Attendance; category: string; fullName: string; organisation: string; jobTitle: string; linkedin: string };
/** Caller owns the transaction. The capacity row lock serialises in-person seat claims. */
export async function submitRsvp(db: PoolClient, input: RsvpInput) {
  const current = await db.query(`select ${FIELDS},owner_token from public.event_registrations where event_slug=$1 and email_normalized=$2 for update`, [input.eventSlug, input.email]);
  if (!current.rowCount) throw new RsvpNotAllowed('not_found');
  const registration = toRegistration(current.rows[0]);
  if (rsvpEligibility(registration.lumaStatus) !== 'eligible') throw new RsvpNotAllowed(registration.lumaStatus);
  if (input.attendance === 'in_person' && registration.attendance !== 'in_person') {
    const state = await seats(db, input.eventSlug, true);
    if (state && state.full) throw new SeatsFull();
  }
  const badge = input.attendance === 'in_person';
  let slug = registration.ticketSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = slug ?? ticketSlug(badge && input.fullName ? input.fullName : registration.fullName);
    try {
      await db.query('savepoint rsvp_slug');
      await db.query(
        `update public.event_registrations set attendance=$2,category=case when $3 then $4 else category end,full_name=case when $3 and $5<>'' then $5 else full_name end,
         organisation=case when $3 then $6 else organisation end,job_title=case when $3 then $7 else job_title end,linkedin_url=case when $3 then $8 else linkedin_url end,
         ticket_slug=$9,rsvp_at=now(),updated_at=now() where id=$1`,
        [registration.id, input.attendance, badge, input.category, input.fullName, input.organisation, input.jobTitle, input.linkedin, input.attendance === 'not_going' ? slug : candidate],
      );
      await db.query('release savepoint rsvp_slug');
      slug = input.attendance === 'not_going' ? slug : candidate;
      break;
    } catch (error) {
      await db.query('rollback to savepoint rsvp_slug');
      if ((error as { code?: string }).code !== '23505' || attempt === 4) throw error;
    }
  }
  // A LinkedIn confirmed on the badge also fills an empty member record.
  if (badge && input.linkedin) await db.query("update public.members set linkedin_url=$2,updated_at=now() where email_normalized=$1 and linkedin_url=''", [input.email, input.linkedin]);
  return { ticketSlug: slug, ownerToken: String(current.rows[0].owner_token), registrationId: registration.id };
}

// Tickets are public links: never read the email (or owner token) into the page.
const TICKET_FIELDS = FIELDS.replace('email,', '');
export async function getTicket(eventSlug: string, slug: string, ownerToken?: string) {
  const result = await database().query(
    `select ${TICKET_FIELDS},(owner_token=$3) is_owner,ticket_emailed_attendance,exists(select 1 from public.members m where m.email_normalized=r.email_normalized) has_member,
      (select m.public_slug from public.members m where m.email_normalized=r.email_normalized and m.profile_public) profile_slug
     from public.event_registrations r where event_slug=$1 and ticket_slug=$2 and attendance in ('in_person','online')`,
    [eventSlug, slug, ownerToken ?? ''],
  );
  const row = result.rows[0];
  return row ? { ...toRegistration(row), isOwner: Boolean(row.is_owner), hasMember: Boolean(row.has_member), profileSlug: (row.profile_slug as string | null) ?? null, emailedAttendance: (row.ticket_emailed_attendance as string | null) ?? null } : null;
}

export async function ownedRegistration(eventSlug: string, ownerToken: string | undefined) {
  if (!ownerToken || !/^[a-f0-9]{48}$/.test(ownerToken)) return null;
  const result = await database().query(`select ${FIELDS} from public.event_registrations where event_slug=$1 and owner_token=$2`, [eventSlug, ownerToken]);
  return result.rows[0] ? toRegistration(result.rows[0]) : null;
}

// ---- Admin -------------------------------------------------------------------------------

export async function importGuests(db: PoolClient, eventSlug: string, guests: LumaGuest[]) {
  if (!findEpisode(eventSlug)) throw new RsvpNotAllowed('unknown_event');
  let created = 0, updated = 0;
  for (const g of guests) {
    // Luma remains the source for identity and approval; attendee-confirmed badge details win after RSVP.
    const result = await db.query(
      `insert into public.event_registrations(event_slug,email,email_normalized,full_name,first_name,last_name,organisation,job_title,linkedin_url,motivation,luma_guest_id,luma_status,luma_registered_at,member_id)
       values($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,(select id from public.members where email_normalized=$2))
       on conflict(event_slug,email_normalized) do update set luma_guest_id=excluded.luma_guest_id,luma_status=excluded.luma_status,luma_registered_at=excluded.luma_registered_at,motivation=excluded.motivation,
        full_name=case when event_registrations.rsvp_at is null then excluded.full_name else event_registrations.full_name end,
        first_name=excluded.first_name,last_name=excluded.last_name,
        organisation=case when event_registrations.rsvp_at is null then excluded.organisation else event_registrations.organisation end,
        job_title=case when event_registrations.rsvp_at is null then excluded.job_title else event_registrations.job_title end,
        linkedin_url=case when event_registrations.rsvp_at is null or event_registrations.linkedin_url='' then excluded.linkedin_url else event_registrations.linkedin_url end,
        member_id=coalesce(event_registrations.member_id,excluded.member_id),updated_at=now()
       returning (xmax=0) inserted`,
      [eventSlug, g.email, g.fullName, g.firstName, g.lastName, g.organisation, g.jobTitle, g.linkedin, g.motivation, g.guestId || null, g.status, g.registeredAt],
    );
    if (result.rows[0].inserted) created++; else updated++;
  }
  return { created, updated };
}

export async function setCapacity(db: PoolClient, eventSlug: string, capacity: number, actor: string) {
  if (!findEpisode(eventSlug)) throw new RsvpNotAllowed('unknown_event');
  await db.query(
    `insert into public.event_settings(event_slug,in_person_capacity,updated_by_name) values($1,$2,$3)
     on conflict(event_slug) do update set in_person_capacity=excluded.in_person_capacity,updated_by_name=excluded.updated_by_name,updated_at=now()`,
    [eventSlug, capacity, actor],
  );
}

export async function adminGuests(eventSlug: string) {
  const db = database();
  const [rows, state] = await Promise.all([
    db.query(`select ${FIELDS} from public.event_registrations where event_slug=$1 order by rsvp_at desc nulls last, full_name asc limit 2000`, [eventSlug]),
    seats(db, eventSlug),
  ]);
  return { guests: rows.rows.map(toRegistration), seats: state };
}
