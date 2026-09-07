import {timingSafeEqual} from 'node:crypto';
import {database} from '@/lib/admin/database';
import {deliverJoinNotifications} from '@/lib/join/service';
export const runtime='nodejs';
export const maxDuration=300;
export async function GET(request:Request){
 const expected=process.env.CRON_SECRET;const supplied=request.headers.get('authorization')||'';
 const match=expected&&supplied.length===('Bearer '+expected).length&&timingSafeEqual(Buffer.from(supplied),Buffer.from('Bearer '+expected));
 if(!match)return Response.json({error:'Unauthorized'},{status:401});
 let db;try{db=await database().connect();return Response.json({sent:await deliverJoinNotifications(db)});}
 catch{return Response.json({error:'Delivery unavailable'},{status:503});}finally{db?.release();}
}
