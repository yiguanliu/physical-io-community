import { checkRobotRequest,robotError } from '@/lib/robot/http';
export async function POST(request:Request){
 const blocked=checkRobotRequest(request);if(blocked)return blocked;
 try{
  const {text}=await request.json();if(typeof text!=='string'||!text.trim()||text.length>1800)return Response.json({error:'Invalid speech text.'},{status:400});
  const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'coral',input:text,instructions:'Warm, thoughtful, curious. Speak naturally, with gentle energy. No exaggerated robot effects.',response_format:'mp3'}),signal:AbortSignal.any([request.signal,AbortSignal.timeout(30000)])});
  if(!response.ok)return robotError({status:response.status});
  return new Response(response.body,{headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-store'}});
 }catch(error){return robotError(error);}
}
