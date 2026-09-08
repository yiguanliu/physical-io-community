import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({requireAdmin:vi.fn(),updateUser:vi.fn(),revalidate:vi.fn(),upload:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({requireAdmin:mocks.requireAdmin}));
vi.mock('next/headers',()=>({cookies:async()=>({})}));
vi.mock('next/cache',()=>({revalidatePath:mocks.revalidate}));
vi.mock('@/utils/supabase/server',()=>({createClient:()=>({auth:{updateUser:mocks.updateUser}})}));
vi.mock('@/lib/marketing/storage',()=>({uploadMedia:mocks.upload}));
import {saveUserDetails,saveHeadshot} from '@/app/admin/profile/actions';
beforeEach(()=>{vi.clearAllMocks();mocks.requireAdmin.mockResolvedValue({id:'current'});mocks.updateUser.mockResolvedValue({error:null});mocks.upload.mockResolvedValue({publicUrl:'https://example.com/headshot.png'});});
describe('user details',()=>{
 it('updates only the signed-in user’s display name',async()=>{expect(await saveUserDetails('  Alex  ')).toEqual({name:'Alex'});expect(mocks.updateUser).toHaveBeenCalledWith({data:{name:'Alex'}});});
 it('rejects empty and oversized names',async()=>{expect(await saveUserDetails(' ')).toHaveProperty('error');expect(await saveUserDetails('x'.repeat(101))).toHaveProperty('error');expect(mocks.updateUser).not.toHaveBeenCalled();});
 it('requires an admin session',async()=>{mocks.requireAdmin.mockRejectedValue(new Error('Unauthorized'));await expect(saveUserDetails('Alex')).rejects.toThrow();expect(mocks.updateUser).not.toHaveBeenCalled();});
 it('returns a recoverable save error',async()=>{mocks.updateUser.mockResolvedValue({error:new Error('Failure')});expect(await saveUserDetails('Alex')).toHaveProperty('error');expect(mocks.revalidate).not.toHaveBeenCalled();});
});

describe('headshots',()=>{
 it('rejects non-image files',async()=>{const form=new FormData();form.set('headshot',new File(['not an image'],'bad.png',{type:'image/png'}));expect(await saveHeadshot(form)).toHaveProperty('error');expect(mocks.upload).not.toHaveBeenCalled();});
 it('uploads to the current user’s namespace and saves only photo metadata',async()=>{const form=new FormData();form.set('headshot',new File([new Uint8Array([137,80,78,71,13,10,26,10])],'photo.png',{type:'image/png'}));expect(await saveHeadshot(form)).toEqual({avatarUrl:'https://example.com/headshot.png'});expect(mocks.upload).toHaveBeenCalledWith(expect.any(Buffer),{mime:'image/png',prefix:'headshots/current'});expect(mocks.updateUser).toHaveBeenCalledWith({data:{headshot_url:'https://example.com/headshot.png'}});});
 it('restores a name placeholder without uploading',async()=>{const form=new FormData();form.set('remove','true');expect(await saveHeadshot(form)).toEqual({avatarUrl:null});expect(mocks.updateUser).toHaveBeenCalledWith({data:{headshot_url:null}});expect(mocks.upload).not.toHaveBeenCalled();});
});
