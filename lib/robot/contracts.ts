import { z } from 'zod';
export const robotReplySchema = z.object({
  reply: z.string().max(1600),
  expression: z.enum(['friendly','curious','happy','thinking','neutral','wink','surprised','sleepy','love']),
  gesture: z.enum(['nod','shake','tilt','none']),
  display: z.enum(['face','text','brand','logo']),
  displayText: z.string().max(100),
});
export type RobotReply = z.infer<typeof robotReplySchema>;
export type FaceSettings = { eyeSize:number; eyeSpacing:number; smile:number; brightness:number };
export type RobotPerformance = RobotReply & { id:number; speaking?:boolean; listening?:boolean; face?:FaceSettings };
export const chatSchema=z.object({messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().min(1).max(2000)})).min(1).max(16)});
