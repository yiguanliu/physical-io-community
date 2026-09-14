import 'server-only';
import { database } from './admin/database';

export type PublicEvent = { id: string; title: string; startsAt: string; venue: string; description: string; registrationUrl: string | null };
export function publicRegistrationUrl(value: string): string | null {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

/** Only explicitly published future events and public fields cross this boundary. */
export async function getPublicEvents(): Promise<{ events: PublicEvent[]; unavailable: boolean }> {
  try {
    const result = await database().query<{ id: string; title: string; starts_at: Date; venue: string; description: string; registration_url: string }>(
      `select id, title, starts_at, venue, description, registration_url
       from public.community_events where status = 'published' and starts_at >= now()
       order by starts_at asc limit 12`,
    );
    return { unavailable: false, events: result.rows.map(event => ({ id: event.id, title: event.title, startsAt: new Date(event.starts_at).toISOString(), venue: event.venue, description: event.description, registrationUrl: publicRegistrationUrl(event.registration_url) })) };
  } catch {
    console.error('Public event listings unavailable');
    return { events: [], unavailable: true };
  }
}
