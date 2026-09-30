import type { PoolClient } from 'pg';
import { slugify } from '../rsvp/model';

/** Reserves a readable, unique public slug such as yiguan-liu or yiguan-liu-2. */
export async function uniqueProfileSlug(db: Pick<PoolClient, 'query'>, name: string, memberId?: string) {
  const base = slugify(name, 48);
  const taken = await db.query(`select public_slug from public.members where (public_slug=$1 or public_slug like $1||'-%') and id is distinct from $2`, [base, memberId ?? null]);
  const used = new Set(taken.rows.map(row => row.public_slug as string));
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
}
