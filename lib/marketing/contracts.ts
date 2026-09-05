import { z } from 'zod';
import { CONTENT_STAGES, PLATFORMS } from './config';
export const webUrl=z.string().max(2000).refine(v=>!v||/^https?:\/\//i.test(v),'Use an http or https URL.');
const text=z.string().max(100000);
export const marketingCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('save'),id:z.string().max(100).optional(),version:z.string().optional(),title:z.string().trim().min(1).max(200),summary:z.string().max(2000),body:text,tags:z.array(z.string().trim().max(80)).max(20),sourceUrl:webUrl,owner:z.string().max(120)}),
 z.object({action:z.literal('stage'),id:z.string().max(100),stage:z.enum(CONTENT_STAGES),scheduledAt:z.string().datetime().optional()}),
 z.object({action:z.literal('variant'),id:z.string().max(100),platform:z.enum(PLATFORMS),body:text,caption:z.string().max(5000),status:z.enum(['draft','ready']),permalink:webUrl,templateId:z.string().max(100).nullable(),assetId:z.string().max(100).nullable()}),
 z.object({action:z.literal('note'),id:z.string().max(100),detail:z.string().trim().min(1).max(5000)}),
 z.object({action:z.literal('template'),name:z.string().trim().min(1).max(100),description:z.string().max(1000),tone:z.string().max(1000)}),
]);
export type MarketingCommand=z.infer<typeof marketingCommand>;
export type ContentItem={id:string;title:string;summary:string;body_markdown:string;status:typeof CONTENT_STAGES[number];category_tags:string[];source_url:string;assigned_to_name:string;updated_at:string;scheduled_at:string|null;published_at:string|null;variants:Variant[]};
export type Variant={id:string;platform:typeof PLATFORMS[number];body:string;caption:string;status:string;external_permalink:string;template_id:string|null;rendered_asset_id:string|null};
export type Asset={id:string;public_url:string;alt_text:string;kind:string};
export type Template={id:string;name:string;description:string;editorial:{tone?:string};layout:Record<string,unknown>};
export type ContentDetail=ContentItem&{assets:Asset[];events:{id:string;detail:string;actor_name:string;created_at:string}[]};
