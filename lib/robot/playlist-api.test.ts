import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), read: vi.fn(), save: vi.fn(), query: vi.fn(), release: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({}) }));
vi.mock('@/utils/supabase/server', () => ({ createClient: () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock('@/lib/admin/database', () => ({ database: () => ({ connect: async () => ({ query: mocks.query, release: mocks.release }) }) }));
vi.mock('@/lib/robot/playlist-store', () => ({ readPlaylist: mocks.read, savePlaylist: mocks.save, PlaylistConflict: class extends Error {} }));
import { GET, PUT } from '@/app/api/admin/robot-messages/route';
import { GET as publicGET } from '@/app/api/robot/messages/route';
import { exampleMessage } from './playlist';
const url = 'http://localhost:3002/api/admin/robot-messages';
const request = (body: unknown, origin = 'http://localhost:3002') => new Request(url, { method: 'PUT', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
describe('OHI playlist authorization and publishing', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: null }, error: null }); });
  it('hides editor access and denies anonymous reads and writes', async () => {
    expect(await (await GET(new Request(url + '?access=1'))).json()).toEqual({ canEdit: false });
    expect((await GET(new Request(url))).status).toBe(401);
    expect((await PUT(request({}))).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('does not trust user-editable metadata', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u', user_metadata: { admin_role: 'admin' }, app_metadata: { admin_role: 'pending' } } }, error: null });
    expect((await PUT(request({}))).status).toBe(401);
  });
  it('rejects cross-origin requests before reaching storage', async () => {
    expect((await PUT(request({}, 'https://other.example'))).status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('validates and transactionally saves for a verified admin', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u', email: 'admin@example.invalid', app_metadata: { admin_role: 'admin' } } }, error: null });
    expect((await PUT(request({ version: 0, messages: [{ ...exampleMessage, speed: 0 }] }))).status).toBe(400);
    mocks.save.mockResolvedValue({ version: 1, messages: [exampleMessage] });
    const response = await PUT(request({ version: 0, messages: [exampleMessage] }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.query.mock.calls.map(call => call[0])).toEqual(['BEGIN', 'COMMIT']);
    expect(mocks.release).toHaveBeenCalled();
  });
  it('rolls back storage failures without exposing database errors', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u', app_metadata: { admin_role: 'admin' } } }, error: null });
    mocks.save.mockRejectedValue(new Error('secret connection string'));
    const response = await PUT(request({ version: 0, messages: [] }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret');
    expect(mocks.query.mock.calls.map(call => call[0])).toEqual(['BEGIN', 'ROLLBACK']);
  });
  it('publishes enabled content only and fails closed on a database outage', async () => {
    mocks.read.mockResolvedValue({ version: 1, messages: [exampleMessage, { ...exampleMessage, id: 'disabled', enabled: false }] });
    expect(await (await publicGET()).json()).toEqual({ messages: [exampleMessage] });
    mocks.read.mockRejectedValue(new Error('database secret'));
    const response = await publicGET();
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ messages: [] });
  });
});
