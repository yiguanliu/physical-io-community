import { createHmac,timingSafeEqual } from 'node:crypto';
export function verifyWebhook(body:string,headers:Headers,secret:string,now=Date.now()){
 const id=headers.get('svix-id'),timestamp=headers.get('svix-timestamp'),signatures=headers.get('svix-signature');if(!id||!timestamp||!/^\d+$/.test(timestamp)||!signatures||Math.abs(now/1000-Number(timestamp))>300)throw new Error('Invalid webhook');
 const expected=createHmac('sha256',Buffer.from(secret.replace(/^whsec_/,''),'base64')).update(`${id}.${timestamp}.${body}`).digest();
 const valid=signatures.split(' ').some(s=>{const [version,value]=s.split(',');if(version!=='v1'||!value)return false;const given=Buffer.from(value,'base64');return given.length===expected.length&&timingSafeEqual(given,expected);});if(!valid)throw new Error('Invalid webhook');return id;
}
