import { afterEach, expect, it, vi } from 'vitest';
import { sendEmail, deliverySettings } from './transport';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.useRealTimers();});
it('uses the verified sender when no override exists',()=>{vi.stubEnv('RESEND_FROM','');expect(deliverySettings().from).toBe('Physical I/O <updates@physical-io.com>');});
it('retries rate limits with the same idempotency key',async()=>{
 vi.useFakeTimers();vi.stubEnv('RESEND_API_KEY','test-key');
 const fetcher=vi.fn().mockResolvedValueOnce(new Response('{}',{status:429,headers:{'retry-after':'1'}})).mockResolvedValueOnce(new Response('{"id":"accepted"}',{status:200}));vi.stubGlobal('fetch',fetcher);
 const result=sendEmail({to:'test@example.invalid',from:'Test <test@example.invalid>',subject:'Test',text:'Hello',headers:{}},'stable-key');await vi.runAllTimersAsync();expect(await result).toEqual({id:'accepted'});expect(fetcher).toHaveBeenCalledTimes(2);
 expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe('stable-key');expect(fetcher.mock.calls[1][1].headers['Idempotency-Key']).toBe('stable-key');
});
