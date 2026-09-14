import 'server-only';
import type { PoolClient } from 'pg';
import { database } from '@/lib/admin/database';
import { playlistSchema, type DisplayPlaylist } from './playlist';

export class PlaylistConflict extends Error {}
export async function readPlaylist(db: Pick<PoolClient, 'query'> = database()): Promise<DisplayPlaylist> {
  const { rows } = await db.query('select version, messages from public.ohi_display_playlist where id = 1');
  if (!rows[0]) throw new Error('OHI playlist is not configured.');
  return playlistSchema.parse(rows[0]);
}

// Caller owns the transaction; compare-and-swap prevents silently overwriting edits.
export async function savePlaylist(db: PoolClient, input: DisplayPlaylist, actor: { id: string; name: string }) {
  const playlist = playlistSchema.parse(input);
  const { rows } = await db.query('update public.ohi_display_playlist set messages=$1::jsonb, version=version+1, updated_at=now() where id=1 and version=$2 returning version, messages', [JSON.stringify(playlist.messages), playlist.version]);
  if (!rows[0]) throw new PlaylistConflict('This playlist changed in another window. Reload the saved playlist before publishing again.');
  await db.query("insert into public.audit_log(actor_user_id,actor_name,action,entity_type,summary) values($1,$2,'robot.playlist.save','robot',$3)", [actor.id, actor.name, `Published OHI playlist version ${rows[0].version} (${playlist.messages.length} messages)`]);
  return playlistSchema.parse(rows[0]);
}
