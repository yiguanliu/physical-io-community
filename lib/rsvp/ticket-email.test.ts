import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin/database', () => ({ database: () => ({}) }));
import { findEpisode } from '@/lib/events/catalog';
import { sendTicketEmail, ticketEmail, TICKET_EMAIL_CC } from './ticket-email';

const episode = findEpisode('event-02-robotics')!;
const claim = { id: 'reg-1', email: 'ada@example.com', firstName: 'Ada', fullName: 'Ada Lovelace', attendance: 'in_person' as const, ticketSlug: 'ada-lovelace-abcd', previous: null };

describe('ticket confirmation email', () => {
  it('links the ticket, embeds the label image and gives in-person details', () => {
    const message = ticketEmail(claim, episode, 'https://cdn.example/tickets/ada.png');
    expect(message.subject).toBe('Your ticket: Physical I/O Episode 02: Robotics (in person)');
    expect(message.html).toContain('/event-02-robotics/ticket/ada-lovelace-abcd');
    expect(message.html).toContain('alt="Your ticket for Episode 02"');
    expect(message.html).toContain('https://cdn.example/tickets/ada.png');
    expect(message.text).toContain('Bentham House');
    expect(message.text).not.toContain('Google Meet');
  });
  it('gives online guests the livestream time and Meet link, and works without an image', () => {
    const message = ticketEmail({ ...claim, attendance: 'online' }, episode, null);
    expect(message.subject).toContain('(online)');
    expect(message.text).toContain('18:45–20:15');
    expect(message.html).toContain('https://meet.google.com/htd-farv-kpo');
    expect(message.html).not.toContain('Your ticket for Episode 02');
  });
  it('sends to the guest, copies the team once, and is idempotent per ticket type', async () => {
    const transport = vi.fn().mockResolvedValue({ id: 'x' });
    await sendTicketEmail(claim, episode, null, transport);
    const [payload, key] = transport.mock.calls[0];
    expect(payload.to).toBe('ada@example.com');
    expect(payload.cc).toEqual(TICKET_EMAIL_CC);
    expect(key).toBe('ticket/reg-1/in_person');
    await sendTicketEmail({ ...claim, email: 'anthony@physical-io.com' }, episode, null, transport);
    expect(transport.mock.calls[1][0].cc).not.toContain('anthony@physical-io.com');
  });
});
