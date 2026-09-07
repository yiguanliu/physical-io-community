const buckets=new Map<string,{count:number,until:number}>();
export function checkRobotRequest(request:Request){
  const origin=request.headers.get('origin');
  if(origin && new URL(origin).host!==new URL(request.url).host)return Response.json({error:'Request origin not allowed.'},{status:403});
  if(!process.env.OPENAI_API_KEY)return Response.json({error:'The robot is not connected yet.'},{status:503});
  const now=Date.now();for(const [key,value]of buckets)if(value.until<now)buckets.delete(key);
  const key=request.headers.get('x-forwarded-for')?.split(',')[0]||'local';
  const bucket=buckets.get(key)||{count:0,until:now+60000};
  if(bucket.count>=24)return Response.json({error:'Give me a moment, then try again.'},{status:429});
  bucket.count++;buckets.set(key,bucket);
}
export function robotError(error:unknown){
  const status=(error as {statusCode?:number;status?:number})?.statusCode||(error as {status?:number})?.status;
  console.error('Robot request failed',{status,name:error instanceof Error?error.name:'Unknown'});
  return Response.json({error:status===429?'OpenAI usage is unavailable or limited. Check the project billing and retry.':'I couldn’t connect just now. Please try again.'},{status:status===429?429:502});
}
