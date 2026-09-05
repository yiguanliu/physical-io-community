import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z,ZodError } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { isAdmin } from '@/lib/admin/contracts';
import { database,NotFound,RecordConflict } from '@/lib/admin/database';
import { marketingCommand } from '@/lib/marketing/contracts';
import { readMarketing,mutateMarketing } from '@/lib/marketing/database';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function authorize(){const {data:{user},error}=await createClient(await cookies()).auth.getUser();return !error&&isAdmin(user)?user:null;}
function failure(e:unknown){if(e instanceof SyntaxError)return json({error:'Use valid JSON.'},400);if(e instanceof ZodError)return json({error:e.issues.map(i=>i.message).join('; ')},400);if(e instanceof RecordConflict)return json({error:e.message},409);if(e instanceof NotFound)return json({error:'This content no longer exists. Refresh and try again.'},404);console.error('Marketing operation failed',{code:(e as {code?:string})?.code});return json({error:'Content studio could not complete this request. Please retry.'},503);}
export async function GET(req:Request){try{if(!await authorize())return json({error:'Sign in with an authorized admin account.'},401);return json(await readMarketing(new URL(req.url).searchParams.get('id')||undefined));}catch(e){return failure(e);}}
export async function POST(req:Request){try{if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Request origin is not allowed.'},403);const user=await authorize();if(!user)return json({error:'Sign in with an authorized admin account.'},401);const raw=await req.text();if(raw.length>150000)return json({error:'Content is too large.'},413);const {command,requestId}=z.object({command:marketingCommand,requestId:z.string().uuid()}).parse(JSON.parse(raw));const db=await database().connect();try{await db.query('BEGIN');await db.query('select pg_advisory_xact_lock(hashtext($1))',[requestId]);const prior=await db.query('select actor_user_id,entity_id from public.audit_log where id=$1',[requestId]);if(prior.rowCount){if(prior.rows[0].actor_user_id!==user.id)throw new RecordConflict('Request ID already used.');await db.query('COMMIT');return json({id:prior.rows[0].entity_id});}const result=await mutateMarketing(db,command,{id:user.id,name:user.email??'Admin',requestId});await db.query('COMMIT');return json(result);}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}catch(e){return failure(e);}}
