// Explicitly run against the member DB. Every test write is rolled back.
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { sheetBatch,SOURCE,SHEET_ID } from '../../lib/integrations/member-sheet';
import { syncMembers } from '../../lib/integrations/member-sheet-store';
async function main(){
 const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
 try{
  await db.query('BEGIN');
  await db.query(readFileSync('supabase/migrations/20260905160000_google_sheet_member_sync.sql','utf8'));
  const email=`sync-test-${randomUUID()}@example.invalid`, now=Date.now();
  const batch=sheetBatch.parse({spreadsheetId:SOURCE,sheetId:SHEET_ID,requestId:randomUUID(),capturedAt:now,rows:[{email,full_name:'Test Person',city:'London'}]});
  assert.equal((await syncMembers(db,batch) as {created:number}).created,1);
  assert.deepEqual(await syncMembers(db,batch),{replay:true});
  const member=(await db.query('select * from public.members where email_normalized=$1',[email])).rows[0];
  assert.equal(member.status,'review');
  await db.query("update public.members set notes='Keep admin notes',status='paused' where id=$1",[member.id]);
  await db.query("insert into public.subscriptions(member_id,topic,status) values($1,'community','unsubscribed')",[member.id]);
  await syncMembers(db,{...batch,requestId:randomUUID(),capturedAt:now+1,rows:[{...batch.rows[0],city:'Paris'}]});
  await syncMembers(db,{...batch,requestId:randomUUID(),capturedAt:now});
  const after=(await db.query('select * from public.members where id=$1',[member.id])).rows[0];
  assert.equal(after.city,'Paris');assert.equal(after.notes,'Keep admin notes');assert.equal(after.status,'paused');
  assert.equal((await db.query('select status from public.subscriptions where member_id=$1',[member.id])).rows[0].status,'unsubscribed');
  await db.query("update public.members set city='Berlin' where id=$1",[member.id]);
  await syncMembers(db,{...batch,requestId:randomUUID(),capturedAt:now+2,rows:[{...batch.rows[0],city:'Rome'}]});
  assert.equal((await db.query('select city from public.members where id=$1',[member.id])).rows[0].city,'Berlin');
  assert.equal((await db.query('select count(*)::int n from public.members where email_normalized=$1',[email])).rows[0].n,1);
  console.log('PASS: create, replay, deduplication, ordered updates, admin edits, status and unsubscribe protection; all writes rolled back.');
 }finally{await db.query('ROLLBACK');await db.end();}
}
main().catch(()=>{console.error('Sync integration verification failed');process.exitCode=1;});
