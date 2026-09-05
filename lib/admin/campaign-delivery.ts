import type { PoolClient } from 'pg';
import { z } from 'zod';
import { database,RecordConflict,NotFound } from './database';
import { resolveAudience,skipReasonForMember,personalise,type AudienceMember } from './audience';
import { digest,emailConfiguration,sendEmail,DeliveryError,type EmailTransport,type EmailPayload } from '@/lib/email/transport';
const strings=z.array(z.string().max(200)).max(1000).optional();
const audienceSchema=z.object({memberIds:strings,statuses:strings,cities:strings,roles:strings,interests:strings,kind:z.enum(['subscribed']).optional(),topic:z.string().optional(),campaignType:z.string().optional(),requireConsent:z.boolean().optional()}).strict();
export const deliveryCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('send'),id:z.string().uuid(),requestId:z.string().uuid(),confirmation:z.string().length(64)}),
 z.object({action:z.literal('test'),id:z.string().uuid(),requestId:z.string().uuid(),email:z.string().email().max(254)})
]);
type Actor={id:string;name:string};
async function campaign(db:PoolClient,id:string){const r=await db.query('select * from public.campaigns where id=$1',[id]);if(!r.rowCount)throw new NotFound();return r.rows[0];}
async function people(db:PoolClient,id?:string):Promise<(AudienceMember&{unsubscribeToken:string})[]>{const r=await db.query(`select m.*,coalesce((select json_agg(json_build_object('topic',s.topic,'status',s.status)) from public.subscriptions s where s.member_id=m.id and s.channel='email'),'[]') subscriptions,coalesce((select json_agg(i.interest) from public.member_interests i where i.member_id=m.id),'[]') interests from public.members m ${id?'where m.id=$1':''} order by m.id`,id?[id]:[]);return r.rows.map(m=>({id:m.id,email:m.email,fullName:m.full_name,firstName:m.first_name,city:m.city,professionalRole:m.professional_role,status:m.status,emailStatus:m.email_status,subscriptions:m.subscriptions,interests:m.interests,unsubscribeToken:m.unsubscribe_token}));}
function filterFor(c:Record<string,any>){let raw=c.audience_filter;if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch{throw new RecordConflict('Invalid saved audience. Edit the draft before sending.');}}const parsed=audienceSchema.safeParse(raw??{});if(!parsed.success)throw new RecordConflict('This audience is not supported for community batch email. Select members or use an opted-in audience.');return {...parsed.data,campaignType:c.type,requireConsent:true,statuses:parsed.data.statuses?.length?parsed.data.statuses:['active']};}
export async function previewDelivery(db:PoolClient,id:string){const c=await campaign(db,id);const {eligible,skipped}=resolveAudience(await people(db),filterFor(c));const counts=(await db.query('select status,count(*)::int count from public.campaign_recipients where campaign_id=$1 group by status',[id])).rows;return {campaign:c,eligibleCount:eligible.length,skippedCount:skipped.length,sample:eligible.slice(0,8).map(m=>({name:m.fullName,email:m.email})),counts,confirmation:digest({id:c.id,version:c.updated_at,subject:c.subject,body:c.body,audience:c.audience_filter,recipients:eligible.map(m=>[m.id,m.email])}),...emailConfiguration()};}
async function log(db:PoolClient,id:string,type:string,payload:unknown,actor:Actor,requestId:string){await db.query('insert into public.campaign_events(id,campaign_id,type,payload) values($1,$2,$3,$4)',[requestId,id,type,JSON.stringify(payload)]);await db.query('insert into public.audit_log(id,actor_user_id,actor_name,action,entity_type,entity_id,summary) values($1,$2,$3,$4,\'campaign\',$5,$6)',[requestId,actor.id,actor.name,`campaign.${type}`,id,`${type}: ${JSON.stringify(payload)}`]);}
// Each request sends at most 10 recipients. A database session lock coordinates
// all app instances. Accepted/uncertain recipients are never blindly replayed.
export async function deliverBatch(db:PoolClient,input:z.infer<typeof deliveryCommand>,actor:Actor,transport:EmailTransport=sendEmail,config={from:process.env.RESEND_FROM??'',site:process.env.NEXT_PUBLIC_SITE_URL??''}){
 if(transport===sendEmail&&!emailConfiguration().configured)throw new RecordConflict(emailConfiguration().message);
 const lock=(await db.query('select pg_try_advisory_lock(hashtext($1)) locked',[`campaign:${input.id}`])).rows[0].locked;if(!lock)throw new RecordConflict('This campaign is already being processed.');
 try{
  const prior=await db.query('select payload from public.campaign_events where id=$1 and campaign_id=$2',[input.requestId,input.id]);if(prior.rowCount)return prior.rows[0].payload;
  const c=await campaign(db,input.id);
  if(!c.body.trim()||!c.subject.trim())throw new RecordConflict('Save a subject and message before sending.');
  if(input.action==='test'){
   const payload:EmailPayload={from:config.from,to:input.email,subject:`[TEST] ${c.subject}`,text:personalise(c.body,{firstName:actor.name.split(' ')[0],fullName:actor.name,email:input.email,city:''}),headers:{'X-Physical-IO-Campaign':c.id}};
   const result=await transport(payload,`test/${input.requestId}`);const summary={test:true,providerId:result.id};await log(db,c.id,'test_sent',summary,actor,input.requestId);return summary;
  }
  if(!['draft','sending'].includes(c.status))throw new RecordConflict('Only a draft or an in-progress campaign can be sent.');
  const filter=filterFor(c);
  if(c.status==='draft'){
   const preview=await previewDelivery(db,c.id);if(preview.confirmation!==input.confirmation)throw new RecordConflict('The draft or audience changed. Review the preview again.');if(!preview.eligibleCount)throw new RecordConflict('No eligible opted-in members match this audience.');
   if((await db.query('select id from public.campaign_recipients where campaign_id=$1 limit 1',[c.id])).rowCount)throw new RecordConflict('This draft has delivery history; reconcile it before sending again.');
   const {eligible,skipped}=resolveAudience(await people(db),filter);
   await db.query('BEGIN');try{const locked=await db.query('select status,updated_at from public.campaigns where id=$1 for update',[c.id]);if(locked.rows[0].status!=='draft'||new Date(locked.rows[0].updated_at).getTime()!==new Date(c.updated_at).getTime())throw new RecordConflict('Draft changed. Preview again.');for(const m of eligible)await db.query('insert into public.campaign_recipients(campaign_id,member_id,email,name) values($1,$2,$3,$4)',[c.id,m.id,m.email,m.fullName]);for(const {member:m,reason} of skipped)await db.query("insert into public.campaign_recipients(campaign_id,member_id,email,name,status,skip_reason) values($1,$2,$3,$4,'skipped',$5)",[c.id,m.id,m.email,m.fullName,reason]);await db.query("update public.campaigns set status='sending',recipient_count=$2,skip_count=$3,updated_at=now() where id=$1",[c.id,eligible.length,skipped.length]);await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}
  }
  // Any leftover 'processing' row has an unknown outcome from an interrupted request.
  await db.query("update public.campaign_recipients set status='uncertain',skip_reason='Interrupted delivery; reconcile with provider' where campaign_id=$1 and status='processing'",[c.id]);
  const pending=(await db.query("select * from public.campaign_recipients where campaign_id=$1 and status='pending' order by created_at,id limit 10",[c.id])).rows;
  for(const r of pending){const m=(await people(db,r.member_id))[0];const reason=!m?'member_removed':m.email!==r.email?'email_changed':skipReasonForMember(m,filter);if(reason){await db.query("update public.campaign_recipients set status='skipped',skip_reason=$2 where id=$1",[r.id,reason]);continue;}
   const unsubscribe=new URL('/unsubscribe',config.site);unsubscribe.searchParams.set('token',m.unsubscribeToken);
   const oneClick=new URL('/api/email/unsubscribe',config.site);oneClick.searchParams.set('token',m.unsubscribeToken);
   const payload:EmailPayload={from:config.from,to:r.email,subject:c.subject,text:`${personalise(c.body,m)}\n\nUnsubscribe: ${unsubscribe}`,headers:{'List-Unsubscribe':`<${oneClick}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click','X-Physical-IO-Campaign':c.id},...(c.reply_to?{reply_to:c.reply_to}:{})};
   await db.query("update public.campaign_recipients set status='processing' where id=$1",[r.id]);
   try{const result=await transport(payload,`campaign/${c.id}/${r.id}`);await db.query('BEGIN');try{await db.query("update public.campaign_recipients set status='sent',provider_id=$2,sent_at=now() where id=$1",[r.id,result.id]);await db.query('update public.members set last_contacted_at=now() where id=$1',[m.id]);await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}}
   catch(e){const uncertain=!(e instanceof DeliveryError)||e.uncertain;await db.query('update public.campaign_recipients set status=$2,skip_reason=$3 where id=$1',[r.id,uncertain?'uncertain':'failed',uncertain?'Check provider before retrying':'Provider rejected email']);}
  }
  const counts=(await db.query('select status,count(*)::int n from public.campaign_recipients where campaign_id=$1 group by status',[c.id])).rows;const n=(status:string)=>counts.find(r=>r.status===status)?.n??0;const summary={sent:n('sent')+n('delivered')+n('opened')+n('clicked'),failed:n('failed'),uncertain:n('uncertain'),skipped:n('skipped'),remaining:n('pending')};
  await db.query("update public.campaigns set status=$2,recipient_count=$3,skip_count=$4,sent_at=case when $2='sent' then now() else sent_at end,updated_at=now() where id=$1",[c.id,summary.remaining?'sending':summary.failed||summary.uncertain?'failed':'sent',summary.sent,summary.skipped]);await log(db,c.id,'batch',summary,actor,input.requestId);return summary;
 }finally{await db.query('select pg_advisory_unlock(hashtext($1))',[`campaign:${input.id}`]);}
}
export async function getDeliveryPreview(id:string){const db=await database().connect();try{return await previewDelivery(db,id);}finally{db.release();}}
