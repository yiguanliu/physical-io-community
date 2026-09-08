'use server';
import {cookies} from 'next/headers';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireAdmin} from '@/lib/auth/session';
import {createClient} from '@/utils/supabase/server';

export async function saveUserDetails(name: string){
 await requireAdmin();
 const parsed=z.string().trim().min(1,'Enter your name.').max(100,'Use 100 characters or fewer.').safeParse(name);
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 const {error}=await createClient(await cookies()).auth.updateUser({data:{name:parsed.data}});
 if(error)return {error:'Your details could not be saved. Please try again.'};
 revalidatePath('/admin/profile');
 return {name:parsed.data};
}

export async function saveHeadshot(form:FormData){
 const admin=await requireAdmin();
 let url:string|null=null;
 if(form.get('remove')!=='true'){
  const file=form.get('headshot');
  if(!(file instanceof File)||!file.size||file.size>750*1024)return {error:'Choose an image smaller than 750 KB.'};
  const bytes=Buffer.from(await file.arrayBuffer());
  const mime=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'image/webp':null;
  if(!mime)return {error:'Choose a PNG, JPEG or WebP image.'};
  try{const {uploadMedia}=await import('@/lib/marketing/storage');url=(await uploadMedia(bytes,{mime,prefix:`headshots/${admin.id}`})).publicUrl;}catch{return {error:'Your headshot could not be uploaded. Please try again.'};}
 }
 const {error}=await createClient(await cookies()).auth.updateUser({data:{headshot_url:url}});
 if(error)return {error:'Your headshot could not be saved. Please try again.'};
 revalidatePath('/admin/profile');
 return {avatarUrl:url};
}
