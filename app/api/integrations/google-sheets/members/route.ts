import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { sheetBatch, validSignature } from '@/lib/integrations/member-sheet';
import { syncMembers } from '@/lib/integrations/member-sheet-store';
export const runtime='nodejs';
export const maxDuration=60;
const globalDb=globalThis as unknown as {sheetSyncPool?:Pool};
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
  const secret=process.env.GOOGLE_SHEETS_SYNC_SECRET;
  if(!secret || secret.length<32 || !process.env.DATABASE_URL) return json({error:'Sync is not configured'},503);
  // Bound the actual streamed body, not just the caller-provided content length.
  const reader=request.body?.getReader();if(!reader)return json({error:'Missing body'},400);
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512000){await reader.cancel();return json({error:'Batch too large'},413);}chunks.push(value);}
  const raw=Buffer.concat(chunks).toString('utf8');
  if(!validSignature(raw,request.headers.get('x-sync-timestamp')??'',request.headers.get('x-sync-signature')??'',secret)) return json({error:'Invalid signature'},401);
  let batch;try{batch=sheetBatch.parse(JSON.parse(raw));}catch{return json({error:'Invalid source or member data'},400);}
  if(Math.abs(Date.now()-batch.capturedAt)>300000)return json({error:'Expired snapshot'},400);
  const pool=globalDb.sheetSyncPool??=new Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:8000,statement_timeout:45000});
  let db;
  try{db=await pool.connect();await db.query('BEGIN');const result=await syncMembers(db,batch);await db.query('COMMIT');return json(result);}
  catch{if(db)await db.query('ROLLBACK').catch(()=>{});console.error('Member sheet sync failed; transaction rolled back');return json({error:'Sync failed; retry this batch'},503);}
  finally{db?.release();}
}
