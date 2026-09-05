import type { PoolClient } from 'pg';
import { database,RecordConflict,NotFound } from '@/lib/admin/database';
import type { MarketingCommand } from './contracts';
const parse=(x:unknown,fallback:unknown)=>{if(typeof x==='string'){try{return JSON.parse(x);}catch{return fallback;}}return x??fallback;};
const item=(r:Record<string,any>)=>({...r,category_tags:parse(r.category_tags,[]),variants:r.variants??[]});
export async function readMarketing(id?:string){
 const db=database();
 if(id){const found=await db.query('select * from public.content_items where id=$1',[id]);if(!found.rowCount)throw new NotFound();const [variants,assets,events]=await Promise.all([db.query('select * from public.content_platform_variants where content_item_id=$1 order by platform',[id]),db.query('select id,public_url,alt_text,kind from public.content_assets where content_item_id=$1 order by created_at desc',[id]),db.query('select id,detail,actor_name,created_at from public.content_events where content_item_id=$1 order by created_at desc limit 100',[id])]);return {...item(found.rows[0]),variants:variants.rows,assets:assets.rows,events:events.rows};}
 const [items,templates]=await Promise.all([db.query(`select i.*,coalesce((select json_agg(v) from public.content_platform_variants v where v.content_item_id=i.id),'[]') variants from public.content_items i order by i.updated_at desc limit 1001`),db.query('select id,name,description,editorial,layout from public.content_templates order by updated_at desc')]);
 return {items:items.rows.slice(0,1000).map(item),truncated:items.rows.length>1000,templates:templates.rows.map(t=>({...t,editorial:parse(t.editorial,{}),layout:parse(t.layout,{})}))};
}
export async function mutateMarketing(db:PoolClient,c:MarketingCommand,actor:{id:string;name:string;requestId:string}){
 let id='id' in c&&c.id?c.id:crypto.randomUUID();let detail='';let from:string|null=null;
 if(c.action!=='template'&&('id' in c&&c.id)){const current=await db.query('select * from public.content_items where id=$1 for update',[id]);if(!current.rowCount)throw new NotFound();from=current.rows[0].status;if(c.action==='save'&&c.version&&new Date(current.rows[0].updated_at).toISOString()!==c.version)throw new RecordConflict('This story changed in another session. Reopen it before saving.');}
 if(c.action==='save'){
  const values=[c.title,c.summary,c.body,JSON.stringify(c.tags),c.sourceUrl,c.owner,id];
  if(c.id){await db.query('update public.content_items set title=$1,summary=$2,body_markdown=$3,category_tags=$4,source_url=$5,assigned_to_name=$6,status=case when status in (\'approved\',\'scheduled\',\'published\') then \'review\' else status end,updated_at=now() where id=$7',values);}else{await db.query('insert into public.content_items(title,summary,body_markdown,category_tags,source_url,assigned_to_name,id,created_by_user_id,created_by_name) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[...values,actor.id,actor.name]);}
  detail=c.id?'Saved master draft':'Created content idea';
 }else if(c.action==='stage'){
  const variants=await db.query('select platform,status,body,external_permalink from public.content_platform_variants where content_item_id=$1',[id]);
  if(['approved','scheduled','published'].includes(c.stage)&&(!variants.rowCount||variants.rows.some(v=>!['ready','published'].includes(v.status)||!v.body.trim())))throw new RecordConflict('Mark every intended platform variant ready before approval.');
  if(c.stage==='scheduled'&&(!c.scheduledAt||Date.parse(c.scheduledAt)<=Date.now()))throw new RecordConflict('Choose a future publish time.');
  if(c.stage==='published'&&variants.rows.some(v=>!v.external_permalink))throw new RecordConflict('Add a live link for each platform before marking this story published.');
  await db.query('update public.content_items set status=$1,scheduled_at=case when $1=\'scheduled\' then $2::timestamptz else scheduled_at end,published_at=case when $1=\'published\' then now() else published_at end,updated_at=now() where id=$3',[c.stage,c.scheduledAt??null,id]);detail=`Stage changed from ${from} to ${c.stage}`;
 }else if(c.action==='variant'){
  if(c.status==='ready'&&!c.body.trim())throw new RecordConflict('Write platform copy before marking it ready.');
  if(c.assetId&&!(await db.query('select id from public.content_assets where id=$1 and (content_item_id=$2 or content_item_id is null)',[c.assetId,id])).rowCount)throw new RecordConflict('Select an asset belonging to this story.');
  if(c.templateId&&!(await db.query('select id from public.content_templates where id=$1',[c.templateId])).rowCount)throw new NotFound();
  await db.query(`insert into public.content_platform_variants(id,content_item_id,platform,body,caption,status,external_permalink,template_id,rendered_asset_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(content_item_id,platform) do update set body=excluded.body,caption=excluded.caption,status=excluded.status,external_permalink=excluded.external_permalink,template_id=excluded.template_id,rendered_asset_id=excluded.rendered_asset_id,updated_at=now()`,[crypto.randomUUID(),id,c.platform,c.body,c.caption,c.status,c.permalink,c.templateId,c.assetId]);
  await db.query("update public.content_items set status=case when status in ('approved','scheduled','published') then 'review' else status end,updated_at=now() where id=$1",[id]);detail=`Saved ${c.platform} copy (${c.status})`;
 }else if(c.action==='note'){detail=c.detail;
 }else if(c.action==='template'){await db.query('insert into public.content_templates(id,name,description,editorial,created_by_name) values($1,$2,$3,$4,$5)',[id,c.name,c.description,JSON.stringify({tone:c.tone}),actor.name]);detail=`Created template ${c.name}`;}
 if(c.action!=='template')await db.query('insert into public.content_events(id,content_item_id,type,from_status,to_status,detail,actor_name) values($1,$2,$3,$4,$5,$6,$7)',[crypto.randomUUID(),id,c.action==='stage'?'stage_change':'note',from,c.action==='stage'?c.stage:null,detail,actor.name]);
 await db.query('insert into public.audit_log(id,actor_user_id,actor_name,action,entity_type,entity_id,summary) values($1,$2,$3,$4,$5,$6,$7)',[actor.requestId,actor.id,actor.name,`content.${c.action}`,c.action==='template'?'content_template':'content_item',id,detail]);return {id};
}
