import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({list:vi.fn(),set:vi.fn(),audit:vi.fn(),invite:vi.fn(),members:new Map<string,Record<string,unknown>>(),updates:[] as unknown[][]}));
// Members table stand-in: lookups by email, and a record of certification updates.
vi.mock('@/lib/admin/database',()=>({database:()=>({query:async(sql:string,args:unknown[])=>{if(sql.startsWith('update'))mocks.updates.push(args);const emails=(args?.[0] as string[])??[];return {rows:sql.includes('email_normalized=any')?emails.map(e=>mocks.members.get(e)).filter(Boolean):[]};}})}));
vi.mock('@/lib/auth/profiles',()=>({listAdminProfiles:mocks.list,setAdminRole:mocks.set}));
vi.mock('@/lib/admin/store',()=>({writeAudit:mocks.audit}));
vi.mock('@/utils/supabase/admin',()=>({getSupabaseAdminClient:()=>({auth:{admin:{inviteUserByEmail:mocks.invite}}})}));
import {setUserRole,inviteAdministrator,grantAdminToMember,setCommunityAdmin} from './access';
const member=(email:string,extra:Record<string,unknown>={})=>mocks.members.set(email,{id:`m-${email}`,email_normalized:email,full_name:email,photo_url:'',community_admin:false,public_slug:null,...extra});
const actor={id:'actor',name:'Admin'};
beforeEach(()=>{vi.clearAllMocks();mocks.list.mockResolvedValue([{id:'actor',name:'Admin',email:'admin@example.test',role:'admin'},{id:'other',name:'Other',email:'other@example.test',role:'admin'}]);mocks.set.mockResolvedValue({});mocks.audit.mockResolvedValue(undefined);mocks.members.clear();mocks.updates.length=0;member('other@example.test');member('new@example.test');});
describe('access management safeguards',()=>{
 it('rejects self removal',async()=>{await expect(setUserRole({userId:'actor',role:'denied',actor})).rejects.toThrow(/own access/);expect(mocks.set).not.toHaveBeenCalled();});
 it('protects allowlisted admins',async()=>{mocks.list.mockResolvedValue([{id:'other',email:'soul@physical-io.com',role:'admin'}]);await expect(setUserRole({userId:'other',role:'denied',actor})).rejects.toThrow(/allowlist/);});
 it('protects the last admin',async()=>{mocks.list.mockResolvedValue([{id:'other',email:'other@example.test',role:'admin'}]);await expect(setUserRole({userId:'other',role:'pending',actor})).rejects.toThrow(/at least one/);});
 it('removes rights and records an audit',async()=>{await setUserRole({userId:'other',role:'denied',actor});expect(mocks.set).toHaveBeenCalledWith('other','denied');expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({action:'access.denied',entityId:'other'}));});
 it('does not email existing accounts',async()=>{await expect(inviteAdministrator('OTHER@example.test',actor)).rejects.toThrow(/already has an account/);expect(mocks.invite).not.toHaveBeenCalled();});
 it('invites and assigns trusted admin metadata via the role service',async()=>{mocks.invite.mockResolvedValue({data:{user:{id:'new'}},error:null});await inviteAdministrator('new@example.test',actor);expect(mocks.invite).toHaveBeenCalledWith('new@example.test',expect.objectContaining({redirectTo:expect.stringContaining('/admin/reset-password')}));expect(mocks.set).toHaveBeenCalledWith('new','admin');expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({action:'access.invited'}));});
 it('reports invitations that sent but could not be approved',async()=>{mocks.invite.mockResolvedValue({data:{user:{id:'new'}},error:null});mocks.set.mockRejectedValue(new Error('offline'));await expect(inviteAdministrator('new@example.test',actor)).rejects.toThrow(/Invitation sent/);});
 it('only lets members become administrators',async()=>{
  mocks.list.mockResolvedValue([{id:'actor',email:'admin@example.test',role:'admin'},{id:'guest',email:'guest@example.test',role:'pending'}]);
  await expect(setUserRole({userId:'guest',role:'admin',actor})).rejects.toThrow(/Only members/);
  await expect(inviteAdministrator('stranger@example.test',actor)).rejects.toThrow(/Only members/);
  await expect(grantAdminToMember('stranger@example.test',actor)).rejects.toThrow(/Only members/);
  expect(mocks.set).not.toHaveBeenCalled();expect(mocks.invite).not.toHaveBeenCalled();
 });
 it('adds a member with an existing account without sending an invitation',async()=>{
  mocks.list.mockResolvedValue([{id:'actor',email:'admin@example.test',role:'admin'},{id:'m1',email:'new@example.test',role:'pending'}]);
  expect(await grantAdminToMember('New@Example.test',actor)).toEqual({invited:false});
  expect(mocks.set).toHaveBeenCalledWith('m1','admin');expect(mocks.invite).not.toHaveBeenCalled();
 });
 it('certifies administrators with a member profile, with or without a photo',async()=>{
  mocks.list.mockResolvedValue([{id:'actor',email:'admin@example.test',role:'admin'},{id:'other',email:'other@example.test',role:'admin'},{id:'p',email:'new@example.test',role:'pending'}]);
  await expect(setCommunityAdmin({userId:'p',certified:true,actor})).rejects.toThrow(/Only administrators/);
  member('other@example.test');
  await setCommunityAdmin({userId:'other',certified:true,actor});
  expect(mocks.updates).toContainEqual(['m-other@example.test',true]);
  expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({action:'access.certified'}));
 });
 it('removing admin access also removes certification',async()=>{
  member('other@example.test',{photo_url:'x',community_admin:true});
  await setUserRole({userId:'other',role:'denied',actor});
  expect(mocks.updates).toContainEqual(['m-other@example.test']);
 });
});
