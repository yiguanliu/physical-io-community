import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { validSignature, sheetBatch, SOURCE, SHEET_ID, mergeProfile } from './member-sheet';
const base={spreadsheetId:SOURCE,sheetId:SHEET_ID,requestId:'766f46a8-e4e1-432a-9d76-f2d67de5b342',capturedAt:Date.now(),rows:[{email:' Test@Example.com ',full_name:'Test Member'}]};
describe('member sheet sync boundary',()=>{
 it('checks signatures, timestamps and tampering',()=>{const secret='a'.repeat(64),now=Date.now(),ts=String(now),raw=JSON.stringify(base);const signature=createHmac('sha256',secret).update(`${ts}.${raw}`).digest('hex');expect(validSignature(raw,ts,signature,secret,now)).toBe(true);expect(validSignature(raw+' ',ts,signature,secret,now)).toBe(false);expect(validSignature(raw,ts,signature,secret,now+300001)).toBe(false);expect(validSignature(raw,ts,'short',secret,now)).toBe(false);});
 it('pins the source and rejects consent/status assignments',()=>{expect(sheetBatch.parse(base).rows[0].email).toBe('test@example.com');expect(sheetBatch.safeParse({...base,sheetId:1}).success).toBe(false);expect(sheetBatch.safeParse({...base,rows:[{...base.rows[0],status:'active'}]}).success).toBe(false);});
 it('fills missing fields but protects existing admin data on initial sync',()=>{const row=sheetBatch.parse(base).rows[0];expect(mergeProfile({full_name:'Admin name'}, {},row)).toEqual({});expect(mergeProfile({full_name:''},{},row)).toEqual({full_name:'Test Member'});});
 it('updates source-managed values and preserves independent corrections and blanks',()=>{const row={...sheetBatch.parse(base).rows[0],city:'Paris'};expect(mergeProfile({city:'London',full_name:'Admin name'},{city:'London'},row)).toEqual({city:'Paris'});expect(mergeProfile({city:'Berlin',full_name:'Admin name'},{city:'London'},row)).toEqual({});expect(mergeProfile({city:'London',full_name:'Test Member'},{city:'London'},{...row,city:''})).toEqual({});});
});
