import {timingSafeEqual} from 'node:crypto';
import {runCampaignWorker} from '@/lib/admin/campaign-worker';
export const runtime='nodejs';
export const maxDuration=300;
export async function POST(request:Request){
 const expected=process.env.CRON_SECRET;
 const supplied=request.headers.get('authorization')||'';
 if(!expected||Buffer.byteLength(supplied)!==Buffer.byteLength('Bearer '+expected)||!timingSafeEqual(Buffer.from(supplied),Buffer.from('Bearer '+expected)))return Response.json({error:'Unauthorized'},{status:401});
 try{return Response.json(await runCampaignWorker(),{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Background delivery interrupted; pending recipients remain queued.'},{status:503});}
}
