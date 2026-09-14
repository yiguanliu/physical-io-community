import { describe, expect, it, vi } from 'vitest';
import { Pool, type PoolClient } from 'pg';
vi.mock('server-only', () => ({}));
import { readPlaylist, savePlaylist, PlaylistConflict } from './playlist-store';
import { exampleMessage } from './playlist';

describe('playlist persistence', () => {
  it('requires an existing initialized playlist', async () => {
    await expect(readPlaylist({ query: vi.fn().mockResolvedValue({ rows: [] }) })).rejects.toThrow('not configured');
  });
  it('refuses stale saves and does not write an audit for them', async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    await expect(savePlaylist(db as unknown as PoolClient, { version: 1, messages: [] }, { id: 'a', name: 'Admin' })).rejects.toBeInstanceOf(PlaylistConflict);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('version=$2');
  });
  it.skipIf(process.env.OHI_DB_TEST !== '1')('CRUD, stale-write protection and browser-role denial on the connected DB (rolled back)', async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const initial = await readPlaylist(db);
      const actor = { id: crypto.randomUUID(), name: 'OHI rolled-back verification' };
      const message = { ...exampleMessage, id: crypto.randomUUID() };
      const added = await savePlaylist(db, { version: initial.version, messages: [...initial.messages, message] }, actor);
      expect(added.messages.at(-1)?.text).toBe(exampleMessage.text);
      const edited = await savePlaylist(db, { version: added.version, messages: added.messages.map(item => item.id === message.id ? { ...item, text: 'Test', duration: 7, speed: 5, enabled: false } : item) }, actor);
      expect((await readPlaylist(db)).messages.at(-1)?.duration).toBe(7);
      await expect(savePlaylist(db, { version: initial.version, messages: [] }, actor)).rejects.toBeInstanceOf(PlaylistConflict);
      const removed = await savePlaylist(db, { version: edited.version, messages: edited.messages.filter(item => item.id !== message.id) }, actor);
      expect(removed.messages).toEqual(initial.messages);
      const { rows } = await db.query("select relrowsecurity from pg_class where oid='public.ohi_display_playlist'::regclass");
      expect(rows[0].relrowsecurity).toBe(true);
      for (const role of ['anon', 'authenticated']) {
        await db.query('SAVEPOINT role_check');
        await db.query(`SET LOCAL ROLE ${role}`);
        await expect(db.query('select * from public.ohi_display_playlist')).rejects.toMatchObject({ code: '42501' });
        await db.query('ROLLBACK TO SAVEPOINT role_check');
      }
      const audit = await db.query("select count(*)::int n from public.audit_log where actor_user_id=$1 and action='robot.playlist.save'", [actor.id]);
      expect(audit.rows[0].n).toBe(3);
      await db.query('ROLLBACK');
      expect(await readPlaylist(db)).toEqual(initial);
    } finally { await db.query('ROLLBACK'); db.release(); await pool.end(); }
  });
});
