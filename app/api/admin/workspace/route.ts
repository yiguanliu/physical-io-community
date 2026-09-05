import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ZodError } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { requestSchema,isAdmin } from '@/lib/admin/contracts';
import { database,readWorkspace,mutate,NotFound,RecordConflict } from '@/lib/admin/database';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function authorize(){const {data:{user},error}=await createClient(await cookies()).auth.getUser();return !error&&isAdmin(user)?user:null;}
function failure(error:unknown){
 if(error instanceof ZodError)return json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},400);
 if(error instanceof SyntaxError)return json({error:'Request must contain valid JSON.'},400);
 if(error instanceof RecordConflict)return json({error:error.message},409);
 if(error instanceof NotFound)return json({error:'This record no longer exists or cannot be edited. Refresh and try again.'},409);
 if((error as {code?:string})?.code==='23505')return json({error:'A record with these details already exists.'},409);
 console.error('Admin database operation failed', {code:(error as {code?:string})?.code??'unavailable'});
 return json({error:'The workspace could not reach its database. Please retry.'},503);
}
export async function GET(){try{if(!await authorize())return json({error:'Sign in with an authorized admin account.'},401);return json(await readWorkspace());}catch(e){return failure(e);}}
export async function POST(request:Request){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Request origin is not allowed.'},403);
  const user=await authorize();if(!user)return json({error:'Sign in with an authorized admin account.'},401);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Use application/json.'},415);
  const body=await request.text();if(body.length>1000000)return json({error:'Request is too large.'},413);
  const {command,requestId}=requestSchema.parse(JSON.parse(body));const client=await database().connect();
  try{await client.query('BEGIN');await client.query('select pg_advisory_xact_lock(hashtext($1))',[requestId]);const prior=await client.query('select actor_user_id,entity_id from public.audit_log where id=$1',[requestId]);if(prior.rowCount){if(prior.rows[0].actor_user_id!==user.id)throw new RecordConflict('Request identifier already used.');await client.query('COMMIT');return json({id:prior.rows[0].entity_id});}const result=await mutate(client,command,{id:user.id,name:user.email??'Admin',requestId});await client.query('COMMIT');return json(result);}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch(e){return failure(e);}
}
