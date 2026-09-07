import { checkRobotRequest,robotError } from '@/lib/robot/http';
export async function POST(request:Request){
 const blocked=checkRobotRequest(request);if(blocked)return blocked;
 try{
  if(Number(request.headers.get('content-length'))>6_000_000)return Response.json({error:'Recording too long.'},{status:413});
  const form=await request.formData();const file=form.get('audio');
  if(!(file instanceof File)||file.size>5_000_000||!file.size)return Response.json({error:'Please record a short message.'},{status:400});
  const body=new FormData();body.append('file',file);body.append('model','gpt-4o-mini-transcribe');
  const response=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body,signal:AbortSignal.any([request.signal,AbortSignal.timeout(30000)])});
  if(!response.ok)return robotError({status:response.status});
  const result=await response.json();return Response.json({text:result.text},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return robotError(error);}
}
