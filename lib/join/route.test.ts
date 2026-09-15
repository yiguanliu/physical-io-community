import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), save: vi.fn(), otp: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({}) }));
vi.mock('@/lib/admin/database', () => ({ database: () => ({ connect: async () => ({ query: mocks.query, release: mocks.release }) }) }));
vi.mock('@/lib/join/service', () => ({ saveSignup: mocks.save, deliverJoinNotifications: vi.fn(), JoinRateLimit: class extends Error {} }));
vi.mock('@/utils/supabase/server', () => ({ createClient: () => ({ auth: { signInWithOtp: mocks.otp } }) }));
import { POST } from '@/app/api/join/route';
const profile = { firstName:'Test',lastName:'Visitor',email:'member@example.com',city:'London',role:'Designer',experience:'3–5 years',work:'Robotics',website:'https://example.com',linkedin:'https://linkedin.com/in/test-visitor',goals:['Meet peers'],formats:['Talks / panels'],suggestions:'',consent:true,updates:false };
const request = (body = profile) => new Request('https://www.physical-io.com/api/join', { method:'POST', headers:{ origin:'https://www.physical-io.com', 'Content-Type':'application/json' }, body:JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','test'); mocks.otp.mockResolvedValue({error:null}); });
it('saves the consented profile before requesting an account confirmation code', async () => {
 const result = await POST(request());
 expect(result.status).toBe(200);
 expect(mocks.query).toHaveBeenCalledWith('commit');
 expect(mocks.otp).toHaveBeenCalledWith({ email:profile.email, options:{shouldCreateUser:true,emailRedirectTo:'https://www.physical-io.com/auth/confirm'} });
 expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(mocks.otp.mock.invocationCallOrder[0]);
});
it('sends no code without consent', async () => { expect((await POST(request({...profile,consent:false}))).status).toBe(400); expect(mocks.otp).not.toHaveBeenCalled(); });
it('sends no code if saving fails', async () => { mocks.save.mockRejectedValue(new Error('offline')); expect((await POST(request())).status).toBe(503); expect(mocks.otp).not.toHaveBeenCalled(); });
it('preserves a saved profile and explains retry when email delivery fails', async () => {
 mocks.otp.mockResolvedValue({error:{message:'rate limited'}});
 const result=await POST(request()); expect(result.status).toBe(503); expect((await result.json()).error).toContain('Your profile is saved'); expect(mocks.query).not.toHaveBeenCalledWith('rollback'); expect(mocks.release).toHaveBeenCalled();
});
it('allows an existing unchanged profile to receive a code', async () => { mocks.save.mockResolvedValue(undefined); expect((await POST(request())).status).toBe(200); expect(mocks.otp).toHaveBeenCalledOnce(); });
