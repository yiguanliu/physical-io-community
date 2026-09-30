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
  await db.query("insert into campaigns(id,name,subject,body,idempotency_key) values($1,'Test','Hello','## Hello {{first_name}}',$1)",[id]);
  for(let i=0;i<14;i++){const memberId=`member-${String(i).padStart(2,'0')}`;await db.query("insert into members(id,email,email_normalized,full_name,first_name,status,email_status) values($1,$2,$2,'Test Member','Test','active',$3)",[memberId,`${i}@example.invalid`,i===13?'bounced':'ok']);if(i!==12)await db.query("insert into subscriptions(member_id,topic,status) values($1,'newsletter','subscribed')",[memberId]);}
  const preview=await previewDelivery(isolated,id);assert.equal(preview.eligibleCount,13);assert.equal(preview.skippedCount,1);
  const sent:string[]=[];const keys:string[]=[];
  const transport:EmailTransport=async(payload,key)=>{sent.push(payload.to);keys.push(key);assert.ok(payload.html?.includes('<h2'));assert.ok(!payload.text.includes('##'));assert.ok(payload.text.includes('Unsubscribe: https://example.invalid/unsubscribe?token='));assert.ok(payload.headers['List-Unsubscribe']);if(sent.length===1)await db.query("update subscriptions set status='unsubscribed' where member_id='member-01'");return {id:crypto.randomUUID()};};
  const request={action:'send' as const,id,requestId:crypto.randomUUID(),confirmation:preview.confirmation};
  const config={from:'Test <test@example.invalid>',site:'https://example.invalid'};
  const queued=await deliverBatch(isolated,request,actor,transport,config,{enqueueOnly:true});assert.deepEqual(queued,{queued:true});assert.equal(sent.length,0,'enqueue must not contact provider');
  await deliverBatch(isolated,request,actor,transport,config,{enqueueOnly:true});assert.equal(sent.length,0,'enqueue replay must not send');
  // Snapshot rows share a transaction timestamp; make the suppression scenario deterministic.
  await db.query("update campaign_recipients set created_at=timestamp '2026-01-01' + substring(member_id from '[0-9]+$')::int * interval '1 second' where campaign_id=$1",[id]);
  request.requestId=crypto.randomUUID();
  const first=await deliverBatch(isolated,request,actor,transport,config);assert.equal(first.sent,9);assert.equal(first.remaining,3);assert.equal(first.skipped,2);
  await deliverBatch(isolated,request,actor,transport,config);assert.equal(sent.length,9,'same request must not send another batch');
  const second=await deliverBatch(isolated,{...request,requestId:crypto.randomUUID()},actor,transport,config);assert.equal(second.sent,12);assert.equal(second.remaining,0);assert.equal(new Set(keys).size,12);assert.ok(!sent.includes('1@example.invalid'));assert.ok(sent.includes('12@example.invalid'));assert.ok(!sent.includes('13@example.invalid'));
  assert.equal((await db.query('select status from campaigns where id=$1',[id])).rows[0].status,'sent');
  assert.equal((await db.query('select count(*)::int n from campaign_events where campaign_id=$1',[id])).rows[0].n,3);
  assert.equal((await db.query("select count(*)::int n from campaign_recipients where campaign_id=$1 and status='sent'",[id])).rows[0].n,12);
  await assert.rejects(()=>deliverBatch(isolated,{...request,requestId:crypto.randomUUID()},actor,transport,config),/Only a draft/);
  const uncertainId=crypto.randomUUID();await db.query("insert into campaigns(id,name,subject,body,idempotency_key,audience_filter) values($1,'Uncertain','Hello','Test',$1,$2)",[uncertainId,JSON.stringify({memberIds:['member-00']})]);const p=await previewDelivery(isolated,uncertainId);
  const outcome=await deliverBatch(isolated,{...request,id:uncertainId,requestId:crypto.randomUUID(),confirmation:p.confirmation},actor,async()=>{throw new DeliveryError('Timeout',true);},config);assert.equal(outcome.uncertain,1);assert.equal(outcome.sent,0);
  const issuePreview=await previewDelivery(isolated,uncertainId);assert.equal(issuePreview.failures.length,1);assert.equal(issuePreview.failures[0].email,'0@example.invalid');assert.equal(issuePreview.failures[0].status,'uncertain');
  assert.equal((await db.query('select status from campaigns where id=$1',[uncertainId])).rows[0].status,'failed');
 }finally{await db.query('drop table if exists pg_temp.members,pg_temp.subscriptions,pg_temp.member_interests,pg_temp.campaigns,pg_temp.campaign_recipients,pg_temp.campaign_events,pg_temp.audit_log');db.release();await pool.end();}
});

test('event guest email: selected registrations only, member suppression respected, personal ticket links',{skip:process.env.ADMIN_DB_TEST!=='1'},async()=>{
 (globalThis as {emailPool?:unknown}).emailPool=undefined;// The previous test closed the shared pool.
 const pool=emailDatabase(),db=await pool.connect();
 try{
  for(const table of ['members','subscriptions','member_interests','campaigns','campaign_recipients','campaign_events','audit_log','event_registrations'])await db.query(`create temporary table ${table} (like public.${table} including defaults)`);
  const isolated=new Proxy(db,{get(target,prop){if(prop==='query')return (sql:string,...args:any[])=>target.query(sql.replaceAll('public.','pg_temp.'),...args);return Reflect.get(target,prop);}});
  const actor={id:crypto.randomUUID(),name:'Verification'},id=crypto.randomUUID(),ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
  await db.query("insert into members(id,email,email_normalized,full_name,first_name,email_status) values('m-bounced','bounced@example.invalid','bounced@example.invalid','Bounced Member','Bounced','bounced'),('m-ok','member@example.invalid','member@example.invalid','Ok Member','Ok','ok')");
  const guest=(i:number,email:string,name:string,ticket:string|null,attendance:string|null)=>db.query("insert into event_registrations(id,event_slug,email,email_normalized,full_name,first_name,ticket_slug,attendance) values($1,'event-02-robotics',$2,$2,$3,$4,$5,$6)",[ids[i],email,name,name.split(' ')[0],ticket,attendance]);
  await guest(0,'guest@example.invalid','Plain Guest','plain-guest-abcd','online');
  await guest(1,'bounced@example.invalid','Bounced Member',null,null);
  await guest(2,'member@example.invalid','Ok Member','ok-member-efgh','in_person');
  await guest(3,'unselected@example.invalid','Not Selected',null,null);
  await db.query("insert into campaigns(id,name,subject,body,type,audience_filter,idempotency_key) values($1,'Event','Event','Hi {{first_name}} — [ticket]({{ticket_url}})','event_update',$2,$1)",[id,JSON.stringify({eventGuests:{event:'event-02-robotics',registrationIds:ids.slice(0,3)},requireConsent:false})]);
  const preview=await previewDelivery(isolated,id);assert.equal(preview.eligibleCount,2);assert.equal(preview.skippedCount,1);
  const sent:{to:string;text:string;headers:Record<string,string>}[]=[];
  const transport:EmailTransport=async payload=>{sent.push(payload as never);return {id:crypto.randomUUID()};};
  const config={from:'Test <test@example.invalid>',site:'https://example.invalid'};
  const request={action:'send' as const,id,requestId:crypto.randomUUID(),confirmation:preview.confirmation};
  await deliverBatch(isolated,request,actor,transport,config,{enqueueOnly:true});
  const result=await deliverBatch(isolated,{...request,requestId:crypto.randomUUID()},actor,transport,config);
  assert.deepEqual({sent:result.sent,skipped:result.skipped,remaining:result.remaining},{sent:2,skipped:1,remaining:0});
  assert.deepEqual(sent.map(p=>p.to).sort(),['guest@example.invalid','member@example.invalid']);
  const plain=sent.find(p=>p.to==='guest@example.invalid')!,member=sent.find(p=>p.to==='member@example.invalid')!;
  assert.ok(plain.text.includes('Hi Plain'));assert.ok(plain.text.includes('/event-02-robotics/ticket/plain-guest-abcd'));
  assert.ok(!plain.headers['List-Unsubscribe'],'non-members get no member unsubscribe link');assert.ok(plain.text.includes('registered for this Physical I/O event'));
  assert.ok(member.headers['List-Unsubscribe'],'members keep one-click unsubscribe');
  const rows=(await db.query("select registration_id,member_id,status from campaign_recipients where campaign_id=$1 order by email",[id])).rows;
  assert.deepEqual(rows.map(r=>[r.registration_id,r.member_id,r.status]),[[ids[1],'m-bounced','skipped'],[ids[0],null,'sent'],[ids[2],'m-ok','sent']]);
 }finally{await db.query('drop table if exists pg_temp.members,pg_temp.subscriptions,pg_temp.member_interests,pg_temp.campaigns,pg_temp.campaign_recipients,pg_temp.campaign_events,pg_temp.audit_log,pg_temp.event_registrations');db.release();await pool.end();}
});
