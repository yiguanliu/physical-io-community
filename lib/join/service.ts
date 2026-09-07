import type {PoolClient} from 'pg';
import type {JoinInput} from './schema';
import {sendEmail,type EmailTransport} from '../email/transport';
export class JoinRateLimit extends Error{}
export async function saveSignup(db:PoolClient,input:JoinInput,requestKey:string){
 // The caller wraps this in a transaction. Locking makes the limiter shared across servers.
 await db.query("delete from private.join_rate_limits where started_at<now()-interval '1 day'");
 const limit=await db.query("insert into private.join_rate_limits(key) values($1) on conflict(key) do update set attempts=case when join_rate_limits.started_at<now()-interval '1 hour' then 1 else join_rate_limits.attempts+1 end, started_at=case when join_rate_limits.started_at<now()-interval '1 hour' then now() else join_rate_limits.started_at end returning attempts",[requestKey]);
 if(limit.rows[0].attempts>8)throw new JoinRateLimit();
 const result=await db.query("insert into public.members(email,email_normalized,full_name,first_name,city,professional_role,experience_range,website_url,linkedin_url,suggestions,status,source) values($1,$1,$2,$3,$4,$5,$6,$7,$8,$9,'active','website_join') on conflict(email_normalized) do nothing returning id",[input.email,input.fullName,input.fullName.split(/\s+/)[0],input.city,input.role,input.experience,input.website,input.linkedin,input.suggestions]);
 const id=result.rows[0]?.id;
 // Never overwrite an existing person's profile or subscription through a public form.
 if(!id)return;
 for(const [kind,values] of [['work_area',[input.work]],['community_goal',input.goals],['event_format',input.formats]] as const){
  for(const value of new Set(values))await db.query('insert into public.member_interests(member_id,kind,interest) values($1,$2,$3)',[id,kind,value]);
 }
 for(const topic of ['newsletter','events','announcements','community']){
  await db.query("insert into public.subscriptions(member_id,topic,status,consent_at) values($1,$2,$3,$4)",[id,topic,input.updates?'subscribed':'consent_unknown',input.updates?new Date():null]);
 }
 await db.query("insert into public.audit_log(actor_name,action,entity_type,entity_id,summary) values('Website signup','member.join','member',$1,$2)",[id,`Joined via website; profile consent v1 accepted; community email opt-in: ${input.updates?'yes':'no'}.`]);
 for(const recipient of ['soul@physical-io.com','anthony@physical-io.com'])await db.query('insert into private.join_notifications(member_id,recipient) values($1,$2)',[id,recipient]);
 return id as string;
}
export async function deliverJoinNotifications(db:PoolClient,transport:EmailTransport=sendEmail){
 let sent=0;
 for(let i=0;i<10;i++){
  await db.query('begin');
  try{
   const result=await db.query("select n.*,m.full_name,m.email,m.city,m.professional_role from private.join_notifications n join public.members m on m.id=n.member_id where n.status='pending' and n.next_attempt_at<=now() order by n.created_at for update of n skip locked limit 1");
   const n=result.rows[0];if(!n){await db.query('commit');break;}
   // Provider idempotency expires after 24h. Uncertain older deliveries require review.
   if(Date.now()-new Date(n.created_at).getTime()>23*60*60*1000){await db.query("update private.join_notifications set status='review' where id=$1",[n.id]);await db.query('commit');continue;}
   try{
    const result=await transport({from:process.env.RESEND_FROM??'',to:n.recipient,subject:'A new member joined Physical I/O',text:`${n.full_name} has joined Physical I/O.\n\nEmail: ${n.email}\nCity: ${n.city}\nRole: ${n.professional_role}\n\nView their profile: ${process.env.NEXT_PUBLIC_SITE_URL||'https://www.physical-io.com'}/admin/members/${n.member_id}`,headers:{}},`join-${n.id}`);
    await db.query("update private.join_notifications set status='sent',provider_id=$2,sent_at=now(),attempts=attempts+1 where id=$1",[n.id,result.id]);sent++;
   }catch{
    await db.query("update private.join_notifications set attempts=attempts+1,next_attempt_at=now()+interval '10 minutes' where id=$1",[n.id]);
   }
   await db.query('commit');
  }catch(error){await db.query('rollback');throw error;}
 }
 return sent;
}
