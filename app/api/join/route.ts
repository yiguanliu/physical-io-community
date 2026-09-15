import {cookies} from 'next/headers';
import {createClient} from '@/utils/supabase/server';
import {memberAuthConfigured} from '@/lib/auth/member';
import {memberAuthRedirect} from '@/lib/auth/member-redirect';
import {after} from 'next/server';
import {createHash} from 'node:crypto';
import {database} from '@/lib/admin/database';
import {joinSchema} from '@/lib/join/schema';
import {saveSignup,deliverJoinNotifications,JoinRateLimit} from '@/lib/join/service';
export const runtime='nodejs';
export const maxDuration=300;
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'Please submit from this website.'},{status:403});
 if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Invalid submission.'},{status:415});
 const raw=await request.text();
 if(raw.length>16000)return Response.json({error:'Your answers are too long.'},{status:413});
 let input;try{input=joinSchema.safeParse(JSON.parse(raw));}catch{return Response.json({error:'Invalid submission.'},{status:400});}
 if(!input.success)return Response.json({error:input.error.issues[0]?.message||'Check your answers.'},{status:400});
 if(!memberAuthConfigured())return Response.json({error:'Member registration is temporarily unavailable. Please try again later.'},{status:503});
 let db;
 try{
  db=await database().connect();await db.query('begin');
  const key=createHash('sha256').update(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local').digest('hex');
  await saveSignup(db,input.data,key);await db.query('commit');
  after(async()=>{let delivery;try{delivery=await database().connect();await deliverJoinNotifications(delivery);}catch{console.error('Join notification queue unavailable');}finally{delivery?.release();}});
  try{
   const {error}=await createClient(await cookies()).auth.signInWithOtp({email:input.data.email,options:{shouldCreateUser:true,emailRedirectTo:memberAuthRedirect(origin)}});
   if(error)throw error;
  }catch{
   return Response.json({error:'Your profile is saved, but we couldn’t send your email code. Wait a minute and submit again to retry.'},{status:503});
  }
  return Response.json({ok:true});
 }catch(error){
  await db?.query('rollback');
  if(error instanceof JoinRateLimit)return Response.json({error:'Please try again in an hour.'},{status:429});
  console.error('Community signup unavailable');
  return Response.json({error:'We couldn’t save your signup just now. Your answers are still here—please try again.'},{status:503});
 }finally{db?.release();}
}
