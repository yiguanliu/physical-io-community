import {z} from 'zod';
const short=z.string().trim().min(1,'Please answer this question.').max(160);
const optionalUrl=z.string().trim().max(500).transform(value=>value&&!/^https?:\/\//i.test(value)?'https://'+value:value).refine(value=>{if(!value)return true;try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&u.hostname.includes('.')&&!u.username&&!u.password;}catch{return false;}},'Enter a valid website link.');
export const joinSchema=z.object({
 fullName:short,email:z.email('Enter a valid email address.').trim().toLowerCase().max(254),city:short,
 role:short,experience:short,work:z.string().trim().min(1,'Tell us a little about your work.').max(2000),
 website:optionalUrl,linkedin:optionalUrl,
 goals:z.array(short).min(1,'Choose at least one.').max(10),formats:z.array(short).min(1,'Choose at least one.').max(10),
 suggestions:z.string().trim().max(2000),consent:z.literal(true,{error:'Please confirm before joining.'}),
 updates:z.boolean(),websiteTrap:z.string().max(0).optional()
});
export type JoinInput=z.infer<typeof joinSchema>;
export const roles=['Engineer / Developer','Researcher / Academic','Designer / Creative','Founder / Entrepreneur','Product / Strategy','Investor','Student','Curious / Exploring'];
export const experiences=['Less than a year','1–3 years','4–6 years','7–10 years','More than 10 years'];
export const goals=['Meeting collaborators / co-founders','Learning from talks & demos','Sharing my work','Finding opportunities','Making friends in the field'];
export const formats=['In-person meetups & demos','Talks / panels','Hands-on workshops','Hackathons / build sessions','Small-group conversations','Online gatherings'];
