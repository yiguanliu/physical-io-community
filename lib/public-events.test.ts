import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('./admin/database', () => ({ database: () => ({ query }) }));
import { getPublicEvents, publicRegistrationUrl } from './public-events';

describe('public event listings', () => {
  beforeEach(() => { query.mockReset(); });

  it('selects only published upcoming events with an explicit public projection', async () => {
    query.mockResolvedValue({ rows: [{ id: 'event-1', title: 'Speaker night', starts_at: new Date('2026-10-01T17:00:00Z'), venue: 'London', description: 'Meet and share.', registration_url: 'https://luma.com/example', registered_count: 42, internal_note: 'private' }] });
    const result = await getPublicEvents();
    expect(query.mock.calls[0][0]).toMatch(/where status = 'published' and starts_at >= now\(\)/);
    expect(query.mock.calls[0][0]).not.toMatch(/select\s+\*|registered_count|internal_note/i);
    expect(result).toEqual({ unavailable: false, events: [{ id: 'event-1', title: 'Speaker night', startsAt: '2026-10-01T17:00:00.000Z', venue: 'London', description: 'Meet and share.', registrationUrl: 'https://luma.com/example' }] });
  });

  it('distinguishes no published events from an unavailable database', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await getPublicEvents()).toEqual({ events: [], unavailable: false });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      query.mockRejectedValueOnce(new Error('sensitive connection details'));
      expect(await getPublicEvents()).toEqual({ events: [], unavailable: true });
      expect(log).toHaveBeenCalledWith('Public event listings unavailable');
    } finally { log.mockRestore(); }
  });

  it.each(['javascript:alert(1)', 'data:text/html,test', 'http://example.com', 'https://name:secret@example.com', '//example.com', '', '/join'])('does not publish unsafe or non-HTTPS registration URL: %s', value => {
    expect(publicRegistrationUrl(value)).toBeNull();
  });

  it('preserves a valid secure event URL', () => {
    expect(publicRegistrationUrl('https://luma.com/event?ref=community')).toBe('https://luma.com/event?ref=community');
  });
});
