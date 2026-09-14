import { z } from 'zod';
import { minimumDuration } from './dot-matrix';

export const displayMessageSchema = z.object({
  id: z.string().uuid(),
  text: z.string().trim().min(1, 'Enter a message.').max(240)
    .regex(/^[\x20-\x7e\n]+$/, 'Use English letters, numbers and standard punctuation for the LED font.')
    .refine(text => text.split('\n').length <= 3, 'Use up to 3 text lines.'),
  // Older saved messages used a three-line layout without an explicit setting.
  lines: z.number().int().min(1).max(3).default(3),
  duration: z.number().int().min(5).max(120),
  speed: z.number().int().min(1).max(30),
  enabled: z.boolean(),
}).superRefine((message, ctx) => {
  const minimum = minimumDuration(message.text, message.speed, message.lines);
  if (message.duration < minimum) ctx.addIssue({ code: 'custom', path: ['duration'], message: `Use at least ${minimum} seconds so the full message can scroll into view.` });
});
export const playlistSchema = z.object({
  version: z.number().int().min(0),
  messages: z.array(displayMessageSchema).max(20)
    .refine(items => new Set(items.map(item => item.id)).size === items.length, 'Message IDs must be unique.'),
});
export type DisplayMessage = z.infer<typeof displayMessageSchema>;
export type DisplayPlaylist = z.infer<typeof playlistSchema>;
export const exampleMessage: DisplayMessage = {
  id: 'aa21e9f1-d7c2-43ab-a8ca-51128674fbe6',
  text: '#2 Physical I/O: Robotics\nWednesday 7 October\n18:00 - 21:00',
  lines: 1, duration: 40, speed: 10, enabled: true,
};

// A brief face interval separates announcements. No animation during conversation.
export function playlistFrame(messages: DisplayMessage[], elapsed: number) {
  const active = messages.filter(message => message.enabled);
  const total = active.reduce((sum, message) => sum + message.duration + 5, 0);
  if (!total) return null;
  let position = Math.max(0, elapsed) % total;
  for (const message of active) {
    if (position < 5) return null;
    position -= 5;
    if (position < message.duration) return { message, elapsed: position };
    position -= message.duration;
  }
  return null;
}
