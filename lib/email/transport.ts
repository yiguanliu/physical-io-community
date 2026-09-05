import { createHash } from 'node:crypto';
export type EmailPayload={to:string;subject:string;text:string;from:string;reply_to?:string;headers:Record<string,string>};
export type EmailTransport=(payload:EmailPayload,key:string)=>Promise<{id:string}>;
export class DeliveryError extends Error{constructor(message:string,public uncertain=false){super(message);}}
export function emailConfiguration(){return {configured:Boolean(process.env.RESEND_API_KEY&&process.env.RESEND_FROM&&process.env.NEXT_PUBLIC_SITE_URL),message:'Set RESEND_API_KEY, verified RESEND_FROM and NEXT_PUBLIC_SITE_URL to enable delivery.'};}
export const sendEmail:EmailTransport=async(payload,key)=>{
 if(!emailConfiguration().configured)throw new DeliveryError(emailConfiguration().message);
 let response:Response;
 try{response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});}catch{throw new DeliveryError('Delivery response was uncertain. Reconcile with the provider before retrying.',true);}
 const result=await response.json().catch(()=>null);
 if(!response.ok)throw new DeliveryError(`Email provider rejected the request (${response.status}).`,response.status>=500);
 if(!result?.id)throw new DeliveryError('Provider acceptance could not be verified.',true);
 return {id:result.id};
};
export function digest(value:unknown){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
