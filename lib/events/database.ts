import type {PoolClient} from 'pg';
import type {Command} from '@/lib/admin/contracts';
import {NotFound,RecordConflict} from '@/lib/admin/database';
import {transitionError,emptyStudio,type Episode} from './model';
export async function mutateEvent(db:PoolClient,c:Extract<Command,{action:`event.${string}`}>,actor:{id:string;name:string}){
 if(c.action==='event.save')throw new RecordConflict('Use the event workspace.');
 let id=c.id;
 if(id){
  const record=await db.query('select id from public.community_events where id=$1 for update',[id]);if(!record.rowCount)throw new NotFound();
  const state=await db.query('select * from public.event_initiatives where event_id=$1',[id]);
  if((state.rows[0]?.version??0)!==c.version)throw new RecordConflict('This episode changed in another session. Reopen it before saving.');
  if(!state.rowCount)await db.query("insert into public.event_initiatives(event_id,version) values($1,0)",[id]);
 }else if(c.action==='event.initiative.save'){
  id=(await db.query('insert into public.community_events(title,starts_at,venue,description) values($1,$2,$3,$4) returning id',[c.name,c.date,c.location,c.description])).rows[0].id;
  await db.query('insert into public.event_initiatives(event_id,version) values($1,0)',[id]);
 }else throw new NotFound();
 if(c.action==='event.feature'){
  await db.query("update public.event_initiatives set studio=jsonb_set(studio,'{featured}',$2::jsonb),version=version+1,updated_at=now() where event_id=$1",[id,JSON.stringify(c.featured)]);
 }else if(c.action==='event.work.create'){
  const workId=crypto.randomUUID();
  if(c.kind==='content')await db.query('insert into public.content_items(id,title,body_markdown,created_by_user_id,created_by_name) values($1,$2,$3,$4,$5)',[workId,c.name,c.body,actor.id,actor.name]);
  else if(c.kind==='campaign')await db.query("insert into public.campaigns(id,name,subject,body,type,event_id,idempotency_key,created_by_user_id,created_by_name) values($1,$2,$2,$3,'event_update',$4,$1,$5,$6)",[workId,c.name,c.body,id,actor.id,actor.name]);
  else {const org=(await db.query('insert into public.organisations(name) values($1) returning id',[c.name])).rows[0].id;await db.query("insert into public.leads(id,organisation_id,next_action) values($1,$2,$3)",[workId,org,c.body]);}
  await db.query("update public.event_initiatives set studio=jsonb_set(studio,'{links}',coalesce(studio->'links','[]'::jsonb)||$2::jsonb),version=version+1,updated_at=now() where event_id=$1",[id,JSON.stringify([{kind:c.kind,id:workId}])]);
 }else if(c.action==='event.initiative.save'){
  for(const link of c.studio.links){const table={content:'content_items',campaign:'campaigns',lead:'leads'}[link.kind];if(!(await db.query(`select id from public.${table} where id=$1`,[link.id])).rowCount)throw new RecordConflict('A linked record no longer exists. Remove it before saving.');}
  const before=await db.query('select e.*,i.stage,i.studio from public.community_events e join public.event_initiatives i on i.event_id=e.id where e.id=$1',[id]);
  const row=before.rows[0], old=row.studio;
  // Changes to approved proposal/planning require reapproval. Execution checklist updates do not undo progress.
  let stage=row.stage;
  if(['planning','action_plan'].includes(stage)&&((old.brief??'')!==c.studio.brief||row.title!==c.name))stage='proposed';
  else if(stage==='action_plan'&&((old.plan??'')!==c.studio.plan||(row.starts_at?new Date(row.starts_at).toISOString():null)!==c.date||row.venue!==c.location))stage='planning';
  await db.query('update public.community_events set title=$2,starts_at=$3,venue=$4,description=$5,registration_url=$6,updated_at=now() where id=$1',[id,c.name,c.date,c.location,c.description,c.studio.registrationUrl]);
  await db.query('update public.event_initiatives set studio=$2,history=case when stage<>$3 then history || $4::jsonb else history end,stage=$3,version=version+1,updated_at=now() where event_id=$1',[id,JSON.stringify(c.studio),stage,JSON.stringify([{stage,actor:actor.name,at:new Date().toISOString()}])]);
 }else if(c.action==='event.advance'){
  const result=await db.query('select e.*,i.* from public.community_events e join public.event_initiatives i on i.event_id=e.id where e.id=$1',[id]);const r=result.rows[0];
  const event:Episode={id:id!,name:r.title,date:r.starts_at?new Date(r.starts_at).toISOString():'',location:r.venue,description:r.description,stage:r.stage,archived:r.archived,studio:{...emptyStudio(),...r.studio}};
  const error=transitionError(event,c.stage);if(error)throw new RecordConflict(error);
  await db.query('update public.event_initiatives set stage=$2,history=history || $3::jsonb,version=version+1,updated_at=now() where event_id=$1',[id,c.stage,JSON.stringify([{stage:c.stage,actor:actor.name,at:new Date().toISOString()}])]);
 }else if(c.action==='event.archive')await db.query('update public.event_initiatives set archived=$2,version=version+1,updated_at=now() where event_id=$1',[id,c.archived]);
 else if(c.action==='event.delete')await db.query('delete from public.community_events where id=$1',[id]);
 return {id};
}
