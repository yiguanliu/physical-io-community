import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {createClient} from '@/utils/supabase/server';
export async function GET(request:Request){
 const url=new URL(request.url);const code=url.searchParams.get('code');const tokenHash=url.searchParams.get('token_hash');const type=url.searchParams.get('type');
 const destination=(failed:boolean)=>NextResponse.redirect(new URL(failed?'/admin/reset-password?error=invalid_link':'/admin/reset-password',url.origin));
 if(!code&&!tokenHash)return destination(true);
 if(tokenHash&&type!=='recovery'&&type!=='email'&&type!=='signup')return destination(true);
 try{
  const client=createClient(await cookies());
  const {error}=tokenHash?await client.auth.verifyOtp({token_hash:tokenHash,type:type as 'recovery'|'email'|'signup'}):await client.auth.exchangeCodeForSession(code!);
  const response=destination(Boolean(error));response.headers.set('Cache-Control','private, no-store');return response;
 }catch{return destination(true);}
}
