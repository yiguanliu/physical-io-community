import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const SOURCE = '1c-_QhErVJrSDMo0kYyYoGTYETtYLJ0fxJmgIebCAukU';
export const SHEET_ID = 1208179166;
const text = z.string().trim().max(4000).default('');
export const sheetBatch = z.object({
  spreadsheetId: z.literal(SOURCE), sheetId: z.literal(SHEET_ID),
  requestId: z.string().uuid(), capturedAt: z.number().int().positive(),
  rows: z.array(z.object({
    email: z.string().trim().toLowerCase().email().max(320),
    full_name: z.string().trim().min(1).max(300), city: text,
    professional_role: text, experience_range: text,
    website_url: text, linkedin_url: text, suggestions: text,
  }).strict()).max(100),
}).strict();
export type SheetBatch = z.infer<typeof sheetBatch>;
export type Profile = SheetBatch['rows'][number];
export const fields = ['full_name','city','professional_role','experience_range','website_url','linkedin_url','suggestions'] as const;

export function validSignature(raw: string, timestamp: string, signature: string, secret: string, now = Date.now()) {
  if (secret.length < 32 || !/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 300000 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

// On first contact, only fill empty fields. Thereafter only update fields still
// equal to the previous source value, preserving independent admin corrections.
export function mergeProfile(current: Record<string,string>, previous: Partial<Profile>, incoming: Profile) {
  const updates: Record<string,string> = {};
  for (const field of fields) {
    const value = incoming[field];
    if (!value || value === current[field]) continue;
    if (!current[field] || (previous[field] !== undefined && current[field] === previous[field])) updates[field] = value;
  }
  return updates;
}
