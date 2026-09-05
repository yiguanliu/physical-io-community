import { z } from 'zod';
export type Member = {id:string;name:string;email:string;role:string;city:string;joined:string;status:string;topics:string[];notes?:string;website?:string;linkedin?:string;emailStatus?:string;subscriptions?:{topic:string;status:string}[]};
export type Lead = {id:string;company:string;contact:string;email:string;role:string;stage:string;value:string;score:number;next:string;last:string;tone:string};
export type Campaign = {id:string;name:string;type:string;audience:string;status:string;date:string;delivery:string;body:string};
export type CommunityEvent = {id:string;name:string;date:string;location:string;description:string};
export type Activity = {id:string;name:string;status:string;detail:string};
export type WorkspaceData = {members:Member[];leads:Lead[];campaigns:Campaign[];events:CommunityEvent[];runs:Activity[];truncated:boolean};
const text=z.string().trim().min(1).max(200);
const optionalText=z.string().trim().max(200).default('');
const id=z.string().uuid();
export const commandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('member.save'),id:id.optional(),name:text,email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),role:optionalText,city:optionalText,status:z.enum(['Active','Review','Paused','Archived']),notes:z.string().max(10000).optional(),website:z.union([z.literal(''),z.string().url()]).optional(),linkedin:z.union([z.literal(''),z.string().url()]).optional(),topics:z.array(z.string().trim().min(1).max(100)).max(30)}),
 z.object({action:z.literal('member.import'),csv:z.string().min(1).max(800000)}),
 z.object({action:z.literal('member.subscription'),id,topic:z.enum(['newsletter','events','announcements']),status:z.enum(['subscribed','unsubscribed','consent_unknown']),evidence:z.string().trim().min(5).max(1000)}),
 z.object({action:z.literal('member.activate'),ids:z.array(id).min(1).max(1000)}),
 z.object({action:z.literal('lead.save'),id:id.optional(),company:text,contact:text,email:z.union([z.literal(''),z.string().trim().email().max(254)]),role:optionalText,stage:z.enum(['Research','Contacted','Meeting','Proposal','Agreement','Closed']),value:z.string().regex(/^\d+$/, 'Enter a whole-pound GBP amount, for example 12000.').refine(s=>Number(s)<=100000000,'Amount is too large.'),next:z.string().trim().max(2000)}),
 z.object({action:z.literal('campaign.save'),id:id.optional(),name:text,body:z.string().trim().min(1).max(50000),memberIds:z.array(id).max(1000).optional(),audience:z.union([z.literal('Selected members'),z.literal('All opted-in'),z.literal('Saved audience'),z.string().uuid()])}),
 z.object({action:z.literal('event.save'),id:id.optional(),name:text,date:z.string().datetime({offset:true}),location:text,description:z.string().trim().max(10000)})
]);
export const requestSchema=z.object({requestId:z.string().uuid(),command:commandSchema});
export type Command=z.infer<typeof commandSchema>;
export function isAdmin(user:{app_metadata?:Record<string,unknown>}|null){return user?.app_metadata?.admin_role==='admin';}
