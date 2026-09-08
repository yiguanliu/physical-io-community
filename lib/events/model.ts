import { z } from 'zod';
export const stages = ['proposed','planning','action_plan','in_progress','completed','retrospective','improved'] as const;
export const stageNames:Record<string,string> = {proposed:'Proposal',planning:'Planning',action_plan:'Action plan',in_progress:'In action',completed:'Event completed',retrospective:'Recap & retrospective',improved:'Ready for next episode'};
export const nextLabels:Record<string,string> = {proposed:'Approve proposal',planning:'Approve plan',action_plan:'Start action',in_progress:'Complete event',completed:'Start retrospective',retrospective:'Finish review'};
const short=z.string().trim().max(200), note=z.string().max(30000), uuid=z.string().uuid();
const date=z.string().datetime({offset:true}).nullable();
export const taskSchema=z.object({id:uuid,title:short.min(1),owner:short,workstream:z.enum(['Production','Content','Marketing','Outreach','Review']),phase:z.enum(stages),offset:z.number().int().min(-365).max(365).nullable(),dueAt:date,done:z.boolean(),status:z.enum(['todo','doing','done']).optional(),notes:z.string().max(5000)});
export const studioSchema=z.object({featured:z.boolean().optional(),episode:short,owner:short,brief:note,plan:note,recap:note,lessons:note,improvements:note,cover:z.union([z.literal(''),z.string().url().regex(/^https?:\/\//)]),registrationUrl:z.union([z.literal(''),z.string().url().regex(/^https?:\/\//)]),reminderAt:date,reminderDays:z.number().int().min(1).max(30),tasks:z.array(taskSchema).max(150),links:z.array(z.object({kind:z.enum(['content','campaign','lead']),id:uuid})).max(150)}).refine(s=>new Set(s.tasks.map(t=>t.id)).size===s.tasks.length,'Task identifiers must be unique.');
export type EventTask=z.infer<typeof taskSchema>;
export type EventStudio=z.infer<typeof studioSchema>;
export type EventStage=typeof stages[number];
export type Episode={id:string;name:string;date:string;location:string;description:string;studio?:EventStudio;stage?:EventStage;archived?:boolean;version?:number;history?:{stage:string;actor:string;at:string}[]};
export const eventCommands=[
 z.object({action:z.literal('event.feature'),id:uuid,version:z.number().int().min(0),featured:z.boolean()}),
 z.object({action:z.literal('event.work.create'),id:uuid,version:z.number().int().min(0),kind:z.enum(['content','campaign','lead']),name:short.min(1),body:note}),
 z.object({action:z.literal('event.initiative.save'),id:uuid.optional(),version:z.number().int().min(0),name:short.min(1),date,location:short,description:note,studio:studioSchema}),
 z.object({action:z.literal('event.advance'),id:uuid,version:z.number().int().min(0),stage:z.enum(stages)}),
 z.object({action:z.literal('event.archive'),id:uuid,version:z.number().int().min(0),archived:z.boolean()}),
 z.object({action:z.literal('event.delete'),id:uuid,version:z.number().int().min(0)})
] as const;
export const emptyStudio=():EventStudio=>({episode:'',owner:'',brief:'',plan:'',recap:'',lessons:'',improvements:'',cover:'',registrationUrl:'',reminderAt:null,reminderDays:1,tasks:[],links:[]});
export function dueDate(task:EventTask,eventDate:string){if(task.dueAt)return new Date(task.dueAt);if(task.offset===null||!eventDate)return null;const d=new Date(eventDate);d.setDate(d.getDate()+task.offset);return d;}
export function transitionError(event:Episode,next:EventStage):string|null{
 if(event.archived)return 'Restore this event before changing its stage.';
 const from=stages.indexOf(event.stage??'proposed'),to=stages.indexOf(next);
 for(let i=from;i<to;i++){const error=validateStage({...event,stage:stages[i]},stages[i+1]);if(error)return error;}
 return null;
}
function validateStage(event:Episode,next:EventStage):string|null{
 const current=event.stage??'proposed',s=event.studio??emptyStudio();
 if(stages.indexOf(next)!==stages.indexOf(current)+1)return 'Move through the event stages in order.';
 if(event.archived)return 'Restore this event before moving it forward.';
 if(!s.owner.trim())return 'Assign an episode owner before approval.';
 if(current==='proposed'&&!s.brief.trim())return 'Add the proposal brief before approval.';
 if(current==='planning'&&(!s.plan.trim()||!event.date||!event.location.trim()))return 'Confirm the plan, event date and venue before approving planning.';
 if(current==='action_plan'&&(!s.tasks.length||s.tasks.some(t=>!t.owner.trim()||!dueDate(t,event.date))))return 'Give every action an owner and a due date before starting.';
 if(current==='in_progress'&&s.tasks.some(t=>t.phase!=='retrospective'&&t.phase!=='improved'&&!t.done))return 'Complete the pre-event and event-day checklist before completing the event.';
 if(current==='retrospective'&&(!s.recap.trim()||!s.lessons.trim()||!s.improvements.trim()||s.tasks.some(t=>!t.done)))return 'Complete the checklist and record the recap, lessons and next-event improvements.';
 return null;
}
