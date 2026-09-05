import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ZodError } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { isAdmin } from '@/lib/admin/contracts';
import { database,RecordConflict,NotFound } from '@/lib/admin/database';
import { emailDatabase } from '@/lib/email/database';
import { deliveryCommand,deliverBatch,getDeliveryPreview } from '@/lib/admin/campaign-delivery';
export const dynamic='force-dynamic';
export const maxDuration=300;
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function authorize(){const {data:{user},error}=await createClient(await cookies()).auth.getUser();return !error&&isAdmin(user)?user:null;}
function failure(e:unknown){return json({error:e instanceof RecordConflict?e.message:e instanceof ZodError?'Check the request fields.':e instanceof NotFound?'Campaign not found.':'The delivery request could not complete. Refresh status before retrying.'},e instanceof RecordConflict?409:e instanceof NotFound?404:400);}
export async function GET(req:Request){try{if(!await authorize())return json({error:'Admin access required.'},401);const id=new URL(req.url).searchParams.get('id');if(!id)return json({error:'Campaign ID required.'},400);return json(await getDeliveryPreview(id));}catch(e){return failure(e);}}
export async function POST(req:Request){try{if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Origin not allowed.'},403);const user=await authorize();if(!user)return json({error:'Admin access required.'},401);const raw=await req.text();if(raw.length>5000)return json({error:'Request too large.'},413);const input=deliveryCommand.parse(JSON.parse(raw));const db=await emailDatabase().connect();try{return json(await deliverBatch(db,input,{id:user.id,name:user.email??'Admin'}));}finally{db.release();}}catch(e){return failure(e);}}
