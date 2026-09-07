import { chatSchema } from '@/lib/robot/contracts';
import { createRobotAgent } from '@/lib/robot/agent';
import { checkRobotRequest,robotError } from '@/lib/robot/http';
export const maxDuration=60;
export async function POST(request:Request){
 const blocked=checkRobotRequest(request);if(blocked)return blocked;
 try{
  const raw=await request.text();if(raw.length>24000)return Response.json({error:'Conversation is too long.'},{status:413});
  const parsed=chatSchema.safeParse(JSON.parse(raw));if(!parsed.success)return Response.json({error:'Please send a short message.'},{status:400});
  const result=await createRobotAgent().generate({messages:parsed.data.messages,abortSignal:AbortSignal.any([request.signal,AbortSignal.timeout(55000)])});
  return Response.json(result.output,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return robotError(error);}
}
