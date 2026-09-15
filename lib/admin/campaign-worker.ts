import { randomUUID } from 'node:crypto';
import { emailDatabase } from '@/lib/email/database';
import { deliverBatch } from './campaign-delivery';

// The recipient snapshot and queued audit persist independently of the browser.
// Cron resumes queued work if the initial post-response worker is interrupted.
export async function runCampaignWorker(budgetMs=220000) {
 const db=await emailDatabase().connect();
 let locked=false, batches=0;
 const deadline=Date.now()+budgetMs;
 try {
  locked=(await db.query("select pg_try_advisory_lock(hashtext('campaign-worker')) locked")).rows[0].locked;
  if(!locked)return {busy:true,batches};
  while(Date.now()+70000<deadline){
   const {rows}=await db.query(`select c.id,a.actor_user_id,a.actor_name from public.campaigns c
    join lateral (select actor_user_id,actor_name from public.audit_log where entity_id=c.id and action='campaign.queued' order by created_at desc limit 1) a on true
    where c.status='sending' order by c.updated_at,c.id limit 1`);
   if(!rows.length)break;
   const c=rows[0];
   await deliverBatch(db,{action:'send',id:c.id,requestId:randomUUID(),confirmation:'0'.repeat(64)},
    {id:c.actor_user_id,name:c.actor_name},undefined,undefined,{deadline});
   batches++;
  }
  return {busy:false,batches};
 }finally{
  if(locked)await db.query("select pg_advisory_unlock(hashtext('campaign-worker'))");
  db.release();
 }
}
