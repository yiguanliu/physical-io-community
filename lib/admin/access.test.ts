import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({list:vi.fn(),set:vi.fn(),audit:vi.fn(),invite:vi.fn()}));
vi.mock('@/lib/auth/profiles',()=>({listAdminProfiles:mocks.list,setAdminRole:mocks.set}));
vi.mock('@/lib/admin/store',()=>({writeAudit:mocks.audit}));
vi.mock('@/utils/supabase/admin',()=>({getSupabaseAdminClient:()=>({auth:{admin:{inviteUserByEmail:mocks.invite}}})}));
import {setUserRole,inviteAdministrator} from './access';
const actor={id:'actor',name:'Admin'};
beforeEach(()=>{vi.clearAllMocks();mocks.list.mockResolvedValue([{id:'actor',name:'Admin',email:'admin@example.test',role:'admin'},{id:'other',name:'Other',email:'other@example.test',role:'admin'}]);mocks.set.mockResolvedValue({});mocks.audit.mockResolvedValue(undefined);});
describe('access management safeguards',()=>{
 it('rejects self removal',async()=>{await expect(setUserRole({userId:'actor',role:'denied',actor})).rejects.toThrow(/own access/);expect(mocks.set).not.toHaveBeenCalled();});
 it('protects allowlisted admins',async()=>{mocks.list.mockResolvedValue([{id:'other',email:'soul@physical-io.com',role:'admin'}]);await expect(setUserRole({userId:'other',role:'denied',actor})).rejects.toThrow(/allowlist/);});
 it('protects the last admin',async()=>{mocks.list.mockResolvedValue([{id:'other',email:'other@example.test',role:'admin'}]);await expect(setUserRole({userId:'other',role:'pending',actor})).rejects.toThrow(/at least one/);});
 it('removes rights and records an audit',async()=>{await setUserRole({userId:'other',role:'denied',actor});expect(mocks.set).toHaveBeenCalledWith('other','denied');expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({action:'access.denied',entityId:'other'}));});
 it('does not email existing accounts',async()=>{await expect(inviteAdministrator('OTHER@example.test',actor)).rejects.toThrow(/already has an account/);expect(mocks.invite).not.toHaveBeenCalled();});
 it('invites and assigns trusted admin metadata via the role service',async()=>{mocks.invite.mockResolvedValue({data:{user:{id:'new'}},error:null});await inviteAdministrator('new@example.test',actor);expect(mocks.invite).toHaveBeenCalledWith('new@example.test',expect.objectContaining({redirectTo:expect.stringContaining('/admin/reset-password')}));expect(mocks.set).toHaveBeenCalledWith('new','admin');expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({action:'access.invited'}));});
 it('reports invitations that sent but could not be approved',async()=>{mocks.invite.mockResolvedValue({data:{user:{id:'new'}},error:null});mocks.set.mockRejectedValue(new Error('offline'));await expect(inviteAdministrator('new@example.test',actor)).rejects.toThrow(/Invitation sent/);});
});
