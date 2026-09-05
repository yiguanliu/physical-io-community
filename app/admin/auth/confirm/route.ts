import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {createClient} from '@/utils/supabase/server';
export async function GET(request:Request){
 const url=new URL(request.url);const code=url.searchParams.get('code');
 if(!code)return NextResponse.redirect(new URL('/admin/reset-password?error=invalid_link',url.origin));
 const {error}=await createClient(await cookies()).auth.exchangeCodeForSession(code);
 return NextResponse.redirect(new URL(error?'/admin/reset-password?error=invalid_link':'/admin/reset-password',url.origin));
}
