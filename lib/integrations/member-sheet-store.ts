import type { PoolClient } from 'pg';
import { fields, mergeProfile, type SheetBatch } from './member-sheet';

export async function syncMembers(db: Pick<PoolClient, 'query'>, batch: SheetBatch) {
  // Caller owns the transaction. One lock serializes all batches from this source.
  await db.query('select pg_advisory_xact_lock(hashtext($1))', [`sheets:${batch.spreadsheetId}:${batch.sheetId}`]);
  const prior = await db.query('select summary from public.audit_log where id=$1', [batch.requestId]);
  if (prior.rowCount) return { replay: true };
  let created=0, updated=0, unchanged=0;
  const unique = new Map(batch.rows.map(row=>[row.email,row]));
  for (const row of unique.values()) {
    const source = (await db.query('select * from public.member_sheet_sources where spreadsheet_id=$1 and sheet_id=$2 and email_normalized=$3 for update', [batch.spreadsheetId,batch.sheetId,row.email])).rows[0];
    if (source && Number(source.captured_at) >= batch.capturedAt) { unchanged++; continue; }
    const inserted = await db.query(`insert into public.members(email,email_normalized,full_name,first_name,city,professional_role,experience_range,website_url,linkedin_url,suggestions,status,source)
      values($1,$1,$2,$3,$4,$5,$6,$7,$8,$9,'review','google_sheet') on conflict(email_normalized) do nothing returning id`,
      [row.email,row.full_name,row.full_name.split(/\s+/)[0],row.city,row.professional_role,row.experience_range,row.website_url,row.linkedin_url,row.suggestions]);
    const current = (await db.query('select * from public.members where email_normalized=$1 for update', [row.email])).rows[0];
    if (!current) throw new Error('Member lookup failed');
    if (inserted.rowCount) created++;
    else {
      const changes=mergeProfile(current,source?.snapshot??{},row);
      const keys=fields.filter(field=>field in changes);
      if(keys.length){
        const values: unknown[]=keys.map(key=>changes[key]);
        const assignments=keys.map((key,i)=>`${key}=$${i+1}`);
        if(changes.full_name){values.push(changes.full_name.split(/\s+/)[0]);assignments.push(`first_name=$${values.length}`);}
        values.push(current.id);
        await db.query(`update public.members set ${assignments.join(',')},updated_at=now() where id=$${values.length}`, values);
        updated++;
      }else unchanged++;
    }
    await db.query(`insert into public.member_sheet_sources(spreadsheet_id,sheet_id,email_normalized,member_id,snapshot,captured_at)
      values($1,$2,$3,$4,$5,$6) on conflict(spreadsheet_id,sheet_id,email_normalized) do update set snapshot=excluded.snapshot,captured_at=excluded.captured_at,updated_at=now()`,
      [batch.spreadsheetId,batch.sheetId,row.email,current.id,JSON.stringify(row),batch.capturedAt]);
  }
  const result={created,updated,unchanged,duplicates:batch.rows.length-unique.size};
  await db.query("insert into public.audit_log(id,actor_name,action,entity_type,summary) values($1,'Google Sheets sync','member.sheet_sync','members',$2)", [batch.requestId,JSON.stringify(result)]);
  return result;
}
