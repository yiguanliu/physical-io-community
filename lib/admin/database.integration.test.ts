import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,mutate} from './database';
// Explicit opt-in; all writes use a single transaction that is rolled back.
test('admin saves, audit entries and consent preservation (rolled back)',{skip:process.env.ADMIN_DB_TEST!=='1'},async()=>{
 const pool=database();const db=await pool.connect();const actor={id:randomUUID(),name:'Integration verification'};const email=`ohi-test-${randomUUID()}@example.invalid`;
 try{
  await db.query('BEGIN');
  const member=await mutate(db,{action:'member.save',name:'Verification only',email,role:'Engineer',city:'London',status:'Review',topics:['Robotics','Robotics']},actor);
  assert.ok(member.id);assert.equal((await db.query('select count(*)::int n from member_interests where member_id=$1',[member.id])).rows[0].n,1);
  await mutate(db,{action:'member.activate',ids:[member.id!]},actor);
  assert.equal((await db.query('select status from members where id=$1',[member.id])).rows[0].status,'active');
  assert.equal((await db.query('select count(*)::int n from subscriptions where member_id=$1',[member.id])).rows[0].n,0);
  const event=await mutate(db,{action:'event.save',name:'Verification only',date:'2027-01-02T18:00:00.000Z',location:'London',description:'Test'},actor);assert.ok(event.id);
  await mutate(db,{action:'event.save',id:event.id,name:'Updated verification',date:'2027-01-02T19:00:00.000Z',location:'Online',description:'Updated'},actor);
  assert.equal((await db.query('select venue from community_events where id=$1',[event.id])).rows[0].venue,'Online');
  const lead=await mutate(db,{action:'lead.save',company:'Verification only',contact:'Test contact',email:'',role:'Engineer',stage:'Research',value:'12000',next:'Review context'},actor);
  await mutate(db,{action:'lead.save',id:lead.id,company:'Verification only',contact:'Test contact',email:'',role:'Engineer',stage:'Meeting',value:'15000',next:'Prepare meeting'},actor);
  assert.equal((await db.query('select status from leads where id=$1',[lead.id])).rows[0].status,'meeting');
  assert.equal((await db.query('select count(*)::int n from lead_activities where lead_id=$1',[lead.id])).rows[0].n,2);
  const draft=await mutate(db,{action:'campaign.save',name:'Verification only',body:'Initial body',audience:lead.id!},actor);
  await mutate(db,{action:'campaign.save',id:draft.id,name:'Verification only',body:'Updated body',audience:'All opted-in'},actor);
  const saved=(await db.query('select body,status,sent_at from campaigns where id=$1',[draft.id])).rows[0];assert.equal(saved.body,'Updated body');assert.equal(saved.status,'draft');assert.equal(saved.sent_at,null);
  await mutate(db,{action:'member.subscription',id:member.id!,topic:'newsletter',status:'subscribed',evidence:'Member requested newsletter in test'},actor);
  assert.equal((await db.query("select status from subscriptions where member_id=$1 and topic='newsletter'",[member.id])).rows[0].status,'subscribed');
  await mutate(db,{action:'member.import',csv:`Full name,Email address,City\nDo not overwrite,${email},Paris\nImported check,import-${email},London`},actor);
  assert.equal((await db.query('select full_name from members where id=$1',[member.id])).rows[0].full_name,'Verification only');
  const imported=(await db.query('select id,status from members where email=$1',[`import-${email}`])).rows[0];assert.equal(imported.status,'review');
  assert.equal((await db.query('select count(*)::int n from subscriptions where member_id=$1',[imported.id])).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from audit_log where actor_user_id=$1',[actor.id])).rows[0].n,10);
 }finally{await db.query('ROLLBACK');db.release();}
 assert.equal((await pool.query('select count(*)::int n from members where email=$1',[email])).rows[0].n,0);
 await pool.end();
});
