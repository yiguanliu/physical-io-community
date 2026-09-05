import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailDatabase } from '../email/database';
import { previewDelivery,deliverBatch } from './campaign-delivery';
import { DeliveryError,type EmailTransport } from '../email/transport';

test('batch email: consent, fresh suppression, bounded batches, retry idempotency and uncertainty',{skip:process.env.ADMIN_DB_TEST!=='1'},async()=>{
 const pool=emailDatabase(),db=await pool.connect();
 try{
  // Session-local shadow tables: no test record can reach the real community.
  for(const table of ['members','subscriptions','member_interests','campaigns','campaign_recipients','campaign_events','audit_log'])await db.query(`create temporary table ${table} (like public.${table} including defaults including indexes)`);
  const isolated=new Proxy(db,{get(target,prop){if(prop==='query')return (sql:string,...args:any[])=>target.query(sql.replaceAll('public.','pg_temp.'),...args);return Reflect.get(target,prop);}});
  const actor={id:crypto.randomUUID(),name:'Verification'},id=crypto.randomUUID();
  await db.query("insert into campaigns(id,name,subject,body,idempotency_key) values($1,'Test','Hello','Hello {{first_name}}',$1)",[id]);
  for(let i=0;i<14;i++){const memberId=`member-${String(i).padStart(2,'0')}`;await db.query("insert into members(id,email,email_normalized,full_name,first_name,status,email_status) values($1,$2,$2,'Test Member','Test','active',$3)",[memberId,`${i}@example.invalid`,i===13?'bounced':'ok']);if(i!==12)await db.query("insert into subscriptions(member_id,topic,status) values($1,'newsletter','subscribed')",[memberId]);}
  const preview=await previewDelivery(isolated,id);assert.equal(preview.eligibleCount,12);assert.equal(preview.skippedCount,2);
  const sent:string[]=[];const keys:string[]=[];
  const transport:EmailTransport=async(payload,key)=>{sent.push(payload.to);keys.push(key);assert.ok(payload.text.includes('Unsubscribe: https://example.invalid/unsubscribe?token='));assert.ok(payload.headers['List-Unsubscribe']);if(sent.length===1)await db.query("update subscriptions set status='unsubscribed' where member_id='member-01'");return {id:crypto.randomUUID()};};
  const request={action:'send' as const,id,requestId:crypto.randomUUID(),confirmation:preview.confirmation};
  const config={from:'Test <test@example.invalid>',site:'https://example.invalid'};
  const first=await deliverBatch(isolated,request,actor,transport,config);assert.equal(first.sent,9);assert.equal(first.remaining,2);assert.equal(first.skipped,3);
  await deliverBatch(isolated,request,actor,transport,config);assert.equal(sent.length,9,'same request must not send another batch');
  const second=await deliverBatch(isolated,{...request,requestId:crypto.randomUUID()},actor,transport,config);assert.equal(second.sent,11);assert.equal(second.remaining,0);assert.equal(new Set(keys).size,11);assert.ok(!sent.includes('1@example.invalid'));assert.ok(!sent.includes('12@example.invalid'));assert.ok(!sent.includes('13@example.invalid'));
  await assert.rejects(()=>deliverBatch(isolated,{...request,requestId:crypto.randomUUID()},actor,transport,config),/Only a draft/);
  const uncertainId=crypto.randomUUID();await db.query("insert into campaigns(id,name,subject,body,idempotency_key,audience_filter) values($1,'Uncertain','Hello','Test',$1,$2)",[uncertainId,JSON.stringify({memberIds:['member-00']})]);const p=await previewDelivery(isolated,uncertainId);
  const outcome=await deliverBatch(isolated,{...request,id:uncertainId,requestId:crypto.randomUUID(),confirmation:p.confirmation},actor,async()=>{throw new DeliveryError('Timeout',true);},config);assert.equal(outcome.uncertain,1);assert.equal(outcome.sent,0);
  assert.equal((await db.query('select status from campaigns where id=$1',[uncertainId])).rows[0].status,'failed');
 }finally{await db.query('drop table if exists pg_temp.members,pg_temp.subscriptions,pg_temp.member_interests,pg_temp.campaigns,pg_temp.campaign_recipients,pg_temp.campaign_events,pg_temp.audit_log');db.release();await pool.end();}
});
