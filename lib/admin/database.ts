import { Pool, type PoolClient } from 'pg';
import { parseMemberCsv } from './audience';
import type { Command, WorkspaceData } from './contracts';
const singleton=globalThis as unknown as {adminPool?:Pool};
export function database(){
 if(!process.env.DATABASE_URL)throw new Error('Database unavailable');
 return singleton.adminPool??=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:8000,statement_timeout:15000});
}
const title=(s:string)=>s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
export async function readWorkspace():Promise<WorkspaceData>{
 const db=database();
 const [members,leads,campaigns,events,activity]=await Promise.all([
 db.query(`select m.id,m.email,m.full_name,m.professional_role,m.city,m.status,m.signed_up_at,m.notes,m.website_url,m.linkedin_url,m.email_status,coalesce((select json_agg(json_build_object('topic',s.topic,'status',s.status)) from public.subscriptions s where s.member_id=m.id and s.channel='email'),'[]') subscriptions,
 coalesce((select json_agg(i.interest order by i.interest) from public.member_interests i where i.member_id=m.id and i.kind='work_area'),'[]') topics
 from public.members m order by m.created_at desc limit 1001`),
 db.query(`select l.*,o.name company,c.name contact,c.email,c.role from public.leads l join public.organisations o on o.id=l.organisation_id left join public.contacts c on c.id=l.contact_id order by l.updated_at desc limit 1001`),
 db.query('select id,name,type,status,body,audience_filter,updated_at,sent_at,recipient_count from public.campaigns order by updated_at desc limit 1001'),
 db.query('select id,title,starts_at,venue,description from public.community_events order by starts_at desc limit 1001'),
 db.query('select id,action,summary,entity_type,created_at from public.audit_log order by created_at desc limit 100')
 ]);
 return {truncated:[members,leads,campaigns,events].some(r=>r.rows.length>1000),
 members:members.rows.slice(0,1000).map(m=>({id:m.id,name:m.full_name,email:m.email,role:m.professional_role,city:m.city,joined:new Date(m.signed_up_at).toLocaleDateString('en-GB'),status:title(m.status),topics:m.topics,notes:m.notes,website:m.website_url,linkedin:m.linkedin_url,emailStatus:m.email_status,subscriptions:m.subscriptions})),
 leads:leads.rows.slice(0,1000).map(l=>({id:l.id,company:l.company,contact:l.contact??'',email:l.email??'',role:l.role??'',stage:title(l.status),value:String(l.estimated_value_gbp),score:l.fit_score,next:l.next_action,last:l.last_activity_at?new Date(l.last_activity_at).toLocaleString('en-GB'):'No activity recorded',tone:'neutral'})),
 campaigns:campaigns.rows.slice(0,1000).map(c=>({id:c.id,name:c.name,type:title(c.type),status:title(c.status),body:c.body,audience:c.audience_filter?.leadId??(Object.keys(c.audience_filter??{}).length&&c.audience_filter?.kind!=='subscribed'?'Saved audience':'All opted-in'),date:new Date(c.updated_at).toLocaleString('en-GB'),delivery:c.sent_at?`${c.recipient_count} recipients`:'Not sent'})),
 events:events.rows.slice(0,1000).map(e=>({id:e.id,name:e.title,date:new Date(e.starts_at).toISOString(),location:e.venue,description:e.description})),
 runs:activity.rows.map(a=>({id:a.id,name:a.summary||title(a.action),status:'Recorded',detail:`${title(a.entity_type)} · ${new Date(a.created_at).toLocaleString('en-GB')}`}))};
}
export class NotFound extends Error{}
export class RecordConflict extends Error{}
// Caller owns the transaction so data and audit always commit together.
export async function mutate(db:PoolClient,c:Command,actor:{id:string;name:string;requestId?:string}){
 let entityId:string|undefined;
 if(c.action==='member.import'){
  const parsed=parseMemberCsv(c.csv);if(parsed.errors.length)throw new RecordConflict(parsed.errors.slice(0,5).join('; '));if(parsed.rows.length>1000)throw new RecordConflict('Import at most 1,000 rows at a time.');
  let added=0;for(const m of parsed.rows){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email))throw new RecordConflict('CSV contains an invalid email.');const r=await db.query("insert into public.members(email,email_normalized,full_name,first_name,city,professional_role,status,source) values($1,$1,$2,$3,$4,$5,'review','csv') on conflict(email_normalized) do nothing returning id",[m.email,m.fullName,m.fullName.split(' ')[0],m.city,m.professionalRole]);if(r.rowCount){added++;for(const interest of new Set(m.interests))await db.query("insert into public.member_interests(member_id,kind,interest) values($1,'work_area',$2)",[r.rows[0].id,interest]);}}
  entityId=undefined;
 }else if(c.action==='member.subscription'){
  if(!(await db.query('select id from public.members where id=$1',[c.id])).rowCount)throw new NotFound();
  await db.query("insert into public.subscriptions(member_id,channel,topic,status,consent_at,unsubscribed_at) values($1,'email',$2,$3,case when $3='subscribed' then now() else null end,case when $3='unsubscribed' then now() else null end) on conflict(member_id,channel,topic) do update set status=excluded.status,consent_at=case when excluded.status='subscribed' then now() else subscriptions.consent_at end,unsubscribed_at=excluded.unsubscribed_at,updated_at=now()",[c.id,c.topic,c.status]);entityId=c.id;
 }else if(c.action==='member.save'){
  if(c.id){const current=await db.query('select email_normalized from public.members where id=$1 for update',[c.id]);if(!current.rowCount)throw new NotFound();if(current.rows[0].email_normalized!==c.email)throw new RecordConflict('Changing an existing email requires a separate consent review.');}
  const fields=[c.email,c.name,c.name.split(/\s+/)[0],c.city,c.role,c.status.toLowerCase()];
  const r=c.id?await db.query('update public.members set email=$1,email_normalized=$1,full_name=$2,first_name=$3,city=$4,professional_role=$5,status=$6,updated_at=now() where id=$7 returning id',[...fields,c.id]):await db.query('insert into public.members(email,email_normalized,full_name,first_name,city,professional_role,status) values($1,$1,$2,$3,$4,$5,$6) returning id',fields);
  entityId=r.rows[0]?.id;if(!entityId)throw new NotFound();
  await db.query('update public.members set notes=coalesce($2,notes),website_url=coalesce($3,website_url),linkedin_url=coalesce($4,linkedin_url) where id=$1',[entityId,c.notes??null,c.website??null,c.linkedin??null]);
  await db.query("delete from public.member_interests where member_id=$1 and kind='work_area'",[entityId]);
  for(const interest of new Set(c.topics))await db.query("insert into public.member_interests(member_id,kind,interest) values($1,'work_area',$2)",[entityId,interest]);
  // Membership status never grants marketing consent or changes subscriptions.
 }else if(c.action==='member.activate'){
  const ids=[...new Set(c.ids)];const r=await db.query("update public.members set status='active',updated_at=now() where id=any($1::text[]) returning id",[ids]);if(r.rowCount!==ids.length)throw new NotFound();
 }else if(c.action==='event.save'){
  const fields=[c.name,c.description,c.location,c.date];const r=c.id?await db.query('update public.community_events set title=$1,description=$2,venue=$3,starts_at=$4,updated_at=now() where id=$5 returning id',[...fields,c.id]):await db.query('insert into public.community_events(title,description,venue,starts_at) values($1,$2,$3,$4) returning id',fields);entityId=r.rows[0]?.id;if(!entityId)throw new NotFound();
 }else if(c.action==='campaign.save'){
  if(c.audience==='Saved audience'&&!c.id)throw new NotFound();
  if(c.audience==='Selected members'&&!c.memberIds?.length)throw new RecordConflict('Select at least one member.');
  if(!['Selected members','All opted-in','Saved audience'].includes(c.audience)&&!(await db.query('select id from public.leads where id=$1',[c.audience])).rowCount)throw new NotFound();
  const audience=c.audience==='Selected members'?{memberIds:c.memberIds,requireConsent:true,statuses:['active']}:c.audience==='Saved audience'?null:c.audience==='All opted-in'?{kind:'subscribed',topic:'community'}:{kind:'lead',leadId:c.audience};
  const fields=[c.name,c.body,audience===null?null:JSON.stringify(audience)];const r=c.id?await db.query("update public.campaigns set name=$1,subject=$1,body=$2,audience_filter=coalesce($3::jsonb,audience_filter),updated_at=now() where id=$4 and status='draft' returning id",[...fields,c.id]):await db.query("insert into public.campaigns(name,subject,body,audience_filter,idempotency_key,created_by_user_id,created_by_name) values($1,$1,$2,$3,gen_random_uuid()::text,$4,$5) returning id",[...fields,actor.id,actor.name]);entityId=r.rows[0]?.id;if(!entityId)throw new NotFound();
 }else if(c.action==='lead.save'){
  let orgId:string,contactId:string;
  if(c.id){const r=await db.query('select organisation_id,contact_id from public.leads where id=$1 for update',[c.id]);if(!r.rowCount)throw new NotFound();orgId=r.rows[0].organisation_id;contactId=r.rows[0].contact_id;
   await db.query('update public.organisations set name=$1,updated_at=now() where id=$2',[c.company,orgId]);
   if(contactId)await db.query('update public.contacts set name=$1,email=$2,role=$3 where id=$4',[c.contact,c.email,c.role,contactId]);
   else contactId=(await db.query('insert into public.contacts(organisation_id,name,email,role) values($1,$2,$3,$4) returning id',[orgId,c.contact,c.email,c.role])).rows[0].id;
  }else{orgId=(await db.query('insert into public.organisations(name) values($1) returning id',[c.company])).rows[0].id;contactId=(await db.query('insert into public.contacts(organisation_id,name,email,role) values($1,$2,$3,$4) returning id',[orgId,c.contact,c.email,c.role])).rows[0].id;}
  const fields=[orgId,contactId,c.stage.toLowerCase(),Math.round(Number(c.value)),c.next];const r=c.id?await db.query('update public.leads set organisation_id=$1,contact_id=$2,status=$3,estimated_value_gbp=$4,next_action=$5,updated_at=now(),last_activity_at=now() where id=$6 returning id',[...fields,c.id]):await db.query('insert into public.leads(organisation_id,contact_id,status,estimated_value_gbp,next_action,last_activity_at) values($1,$2,$3,$4,$5,now()) returning id',fields);entityId=r.rows[0].id;
  await db.query("insert into public.lead_activities(lead_id,type,title,detail,created_by_name) values($1,'update',$2,$3,$4)",[entityId,c.id?'Lead updated':'Lead created',c.next,actor.name]);
 }
 await db.query('insert into public.audit_log(actor_user_id,actor_name,action,entity_type,entity_id,summary,id) values($1,$2,$3,$4,$5,$6,coalesce($7,gen_random_uuid()::text))',[actor.id,actor.name,c.action,c.action.split('.')[0],entityId??null,c.action==='member.subscription'?`${c.topic}: ${c.status}; evidence: ${c.evidence}`:c.action==='member.activate'?`${c.ids.length} members activated`:`${c.action.split('.')[0]} saved`,actor.requestId??null]);
 return {id:entityId};
}
