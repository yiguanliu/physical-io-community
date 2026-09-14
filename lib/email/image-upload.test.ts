import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({getUser:vi.fn(),upload:vi.fn()}));
vi.mock('next/headers',()=>({cookies:async()=>({})}));
vi.mock('@/utils/supabase/server',()=>({createClient:()=>({auth:{getUser:mocks.getUser}})}));
vi.mock('@/lib/marketing/storage',()=>({uploadMedia:mocks.upload}));
import {POST} from '@/app/api/admin/email-image/route';
beforeEach(()=>{vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:'admin',app_metadata:{admin_role:'admin'}}},error:null});mocks.upload.mockResolvedValue({publicUrl:'https://example.com/image.png'});});
function request(bytes:Uint8Array|string='invalid',origin='http://localhost:3000'){const form=new FormData();form.set('image',new File([typeof bytes==='string'?bytes:new Uint8Array(bytes)],'image.png',{type:'image/png'}));return new Request('http://localhost:3000/api/admin/email-image',{method:'POST',headers:{origin},body:form});}
it('rejects cross-origin uploads',async()=>{expect((await POST(request('x','https://other.example'))).status).toBe(403);expect(mocks.upload).not.toHaveBeenCalled();});
it('rejects non-admin users',async()=>{mocks.getUser.mockResolvedValue({data:{user:null},error:null});expect((await POST(request())).status).toBe(401);expect(mocks.upload).not.toHaveBeenCalled();});
it('rejects a fake image despite its filename and MIME type',async()=>{expect((await POST(request())).status).toBe(400);expect(mocks.upload).not.toHaveBeenCalled();});
it('uploads images to an admin-specific path and returns a durable URL',async()=>{const response=await POST(request(new Uint8Array([137,80,78,71,13,10,26,10])));expect(response.status).toBe(200);expect(await response.json()).toEqual({url:'https://example.com/image.png'});expect(mocks.upload).toHaveBeenCalledWith(expect.any(Buffer),{mime:'image/png',prefix:'email/admin'});});
it('reports storage errors without exposing credentials',async()=>{mocks.upload.mockRejectedValue(new Error('secret'));const response=await POST(request(new Uint8Array([137,80,78,71,13,10,26,10])));expect(response.status).toBe(503);expect(await response.text()).not.toContain('secret');});
