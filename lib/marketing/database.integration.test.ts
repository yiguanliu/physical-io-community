import assert from 'node:assert/strict';
import { test } from 'node:test';
import { database,RecordConflict } from '../admin/database';
import { mutateMarketing } from './database';
import { marketingCommand } from './contracts';

test('content validation rejects unsafe links and empty titles',()=>{
 assert.equal(marketingCommand.safeParse({action:'save',title:' ',summary:'',body:'',tags:[],sourceUrl:'',owner:''}).success,false);
 assert.equal(marketingCommand.safeParse({action:'save',title:'Story',summary:'',body:'',tags:[],sourceUrl:'javascript:alert(1)',owner:''}).success,false);
});
test('content workflow persists atomically, gates approval and detects stale edits',{skip:process.env.ADMIN_DB_TEST!=='1'},async()=>{
 const pool=database(),db=await pool.connect();await db.query('BEGIN');
 const actor=()=>({id:crypto.randomUUID(),name:'Rollback integration check',requestId:crypto.randomUUID()});
 try{
  const created=await mutateMarketing(db,{action:'save',title:'Rollback content test',summary:'Hook',body:'Verified draft',tags:['Research'],sourceUrl:'https://example.com',owner:'Editor'},actor());
  const id=created.id;
  await assert.rejects(()=>mutateMarketing(db,{action:'stage',id,stage:'approved'},actor()),RecordConflict);
  await mutateMarketing(db,{action:'variant',id,platform:'linkedin',body:'Platform copy',caption:'Hook',status:'ready',permalink:'https://example.com/post',templateId:null,assetId:null},actor());
  await mutateMarketing(db,{action:'stage',id,stage:'approved'},actor());
  assert.equal((await db.query('select status from content_items where id=$1',[id])).rows[0].status,'approved');
  await assert.rejects(()=>mutateMarketing(db,{action:'stage',id,stage:'scheduled',scheduledAt:'2020-01-01T00:00:00.000Z'},actor()),RecordConflict);
  await mutateMarketing(db,{action:'variant',id,platform:'linkedin',body:'Changed copy',caption:'',status:'draft',permalink:'',templateId:null,assetId:null},actor());
  assert.equal((await db.query('select status from content_items where id=$1',[id])).rows[0].status,'review');
  await assert.rejects(()=>mutateMarketing(db,{action:'save',id,version:'2020-01-01T00:00:00.000Z',title:'Stale',summary:'',body:'',tags:[],sourceUrl:'',owner:''},actor()),RecordConflict);
  assert.ok(Number((await db.query('select count(*) from content_events where content_item_id=$1',[id])).rows[0].count)>=4);
 }finally{await db.query('ROLLBACK');db.release();await pool.end();}
});
