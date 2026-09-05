import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { isAdmin } from '@/lib/admin/contracts';
import { discoverNews,draftFromSource,adaptForPlatform } from '@/lib/marketing/ai';
import { PLATFORMS } from '@/lib/marketing/config';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('discover'),topic:z.string().max(1000)}),
 z.object({action:z.literal('draft'),title:z.string().max(200),hook:z.string().max(2000),sourceUrl:z.string().max(2000)}),
 z.object({action:z.literal('adapt'),title:z.string().max(200),master:z.string().max(100000),platform:z.enum(PLATFORMS),tone:z.string().max(1000)})
]);
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Request origin is not allowed.'},{status:403});
 const {data:{user},error}=await createClient(await cookies()).auth.getUser();if(error||!isAdmin(user))return NextResponse.json({error:'Admin access required.'},{status:401});
 try{const raw=await req.text();if(raw.length>120000)return NextResponse.json({error:'Request too large.'},{status:413});const c=input.parse(JSON.parse(raw));const result=c.action==='discover'?await discoverNews(c.topic):c.action==='draft'?await draftFromSource(c):await adaptForPlatform({...c,editorial:{tone:c.tone}});return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'Could not prepare a suggestion. Try again.'},{status:400});}
}
