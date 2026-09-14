import { createHash } from 'node:crypto';
import { renderEmailHtml } from './template';
import { SITE_URL } from '@/lib/site';
export function deliverySettings(){return {from:process.env.RESEND_FROM||'Physical I/O <updates@physical-io.com>',site:SITE_URL};}

export type EmailPayload={to:string;subject:string;text:string;html?:string;from:string;reply_to?:string;headers:Record<string,string>};
export type EmailTransport=(payload:EmailPayload,key:string)=>Promise<{id:string}>;
export class DeliveryError extends Error{constructor(message:string,public uncertain=false){super(message);}}
export function emailConfiguration(){return {configured:Boolean(process.env.RESEND_API_KEY),message:'Configure a Resend API key to enable delivery.'};}
export const sendEmail:EmailTransport=async(payload,key)=>{
 if(!emailConfiguration().configured)throw new DeliveryError(emailConfiguration().message);
 let response:Response;
 try{for(let attempt=0;;attempt++){await new Promise(resolve=>setTimeout(resolve,600));response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({...payload,html:payload.html??renderEmailHtml({previewText:payload.subject,body:payload.text})}),signal:AbortSignal.timeout(15000)});if(response.status!==429||attempt>=2)break;const seconds=Number(response.headers.get('retry-after'));await new Promise(resolve=>setTimeout(resolve,Number.isFinite(seconds)&&seconds>0?Math.min(seconds*1000,10000):2000));}}catch{throw new DeliveryError('Delivery response was uncertain. Reconcile with the provider before retrying.',true);}
 const result=await response.json().catch(()=>null);
 if(!response.ok)throw new DeliveryError(`Email provider rejected the request (${response.status}).`,response.status>=500);
 if(!result?.id)throw new DeliveryError('Provider acceptance could not be verified.',true);
 return {id:result.id};
};
export function digest(value:unknown){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
