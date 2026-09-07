import {config} from 'dotenv';
import {Client} from 'pg';
import assert from 'node:assert/strict';
import {joinSchema} from './schema';
import {saveSignup} from './service';
import type {PoolClient} from 'pg';
config({path:['.env.local','.env'],quiet:true});
async function verify(){
 const db=new Client({connectionString:process.env.DATABASE_URL});
 try{
 await db.connect();await db.query('begin');
 const input=joinSchema.parse({fullName:'Onboarding Test',email:'join-test-'+Date.now()+'@example.invalid',city:'London',role:'Engineer / Developer',experience:'Less than a year',work:'Test robotics',website:'example.com',linkedin:'',goals:['Learning from talks & demos'],formats:['Talks / panels'],suggestions:'Verification only',consent:true,updates:false});
 const id=await saveSignup(db as unknown as PoolClient,input,'test-'+Date.now());assert.ok(id);
 assert.equal((await db.query('select count(*)::int n from public.member_interests where member_id=$1',[id])).rows[0].n,3);
 assert.equal((await db.query('select count(*)::int n from private.join_notifications where member_id=$1',[id])).rows[0].n,2);
 assert.equal((await db.query("select count(*)::int n from public.subscriptions where member_id=$1 and status='subscribed'",[id])).rows[0].n,0);
 assert.equal(await saveSignup(db as unknown as PoolClient,{...input,fullName:'Overwrite attempt'},'duplicate-test'),undefined);
 assert.equal((await db.query('select full_name from public.members where id=$1',[id])).rows[0].full_name,'Onboarding Test');
 await db.query('rollback');
 assert.equal((await db.query('select count(*)::int n from public.members where id=$1',[id])).rows[0].n,0);
 console.log('Verified questionnaire mapping, two queued recipients, consent, duplicate protection, and complete rollback.');
 }finally{await db.query('rollback').catch(()=>{});await db.end();}
}
verify().catch(e=>{console.error('Signup verification failed',{code:e.code||e.name});process.exitCode=1;});
