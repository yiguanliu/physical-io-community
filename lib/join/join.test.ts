import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import {joinSchema} from './schema';
import {saveSignup,deliverJoinNotifications} from './service';
const valid={fullName:'Test Visitor',email:'test@example.invalid',city:'London',role:'Engineer / Developer',experience:'Less than a year',work:'Robotics',website:'example.com',linkedin:'',goals:['Meeting collaborators / co-founders'],formats:['Talks / panels'],suggestions:'',consent:true,updates:false};
test('validates consent, addresses, links and selections',()=>{
 assert.equal(joinSchema.parse(valid).website,'https://example.com');
 for(const patch of [{email:'bad'},{consent:false},{goals:[]},{website:'javascript:alert(1)'},{websiteTrap:'spam'}])assert.equal(joinSchema.safeParse({...valid,...patch}).success,false);
});
test('duplicate signup never overwrites an existing membership',async()=>{
 const queries:string[]=[];const db={query:async(sql:string)=>{queries.push(sql);return {rows:sql.startsWith('insert into private.join_rate_limits')?[{attempts:1}]:[]};}} as unknown as PoolClient;
 assert.equal(await saveSignup(db,joinSchema.parse(valid),'ip'),undefined);
 assert.equal(queries.length,3);assert.ok(!queries.some(q=>q.includes('update public.members')));
});
test('failed notification stays queued for retry',async()=>{
 let selected=false;const queries:string[]=[];
 const db={query:async(sql:string)=>{queries.push(sql);if(sql.startsWith('select n.')){if(selected)return {rows:[]};selected=true;return {rows:[{id:'test-notification',member_id:'1',created_at:new Date(),recipient:'soul@physical-io.com'}]};}return {rows:[]};}} as unknown as PoolClient;
 await deliverJoinNotifications(db,async()=>{throw new Error('offline');});
 assert.ok(queries.some(q=>q.includes("next_attempt_at=now()+interval '10 minutes'")));assert.ok(!queries.some(q=>q.includes("status='sent'")));
});
