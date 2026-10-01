'use client';
import {useState,useTransition} from 'react';
import {DEFAULT_HEADSHOT} from '@/lib/members/default-headshot';
import {useRouter} from 'next/navigation';
import {Pencil,UserPlus,ShieldCheck,ArrowUpRight} from 'lucide-react';
import {PageHeader,Toolbar,SearchField,Tabs,Badge,Button,IconButton,DataTable,EmptyState,Dialog,Alert,Toast,Select,Switch,Avatar} from '@/workspace-ui/src';
import {changeAccessAction,inviteAccessAction} from '@/app/admin/actions';
import type {AccessUser,AccessCandidate} from '@/lib/admin/access';
import VerifiedSeal from '@/components/members/VerifiedSeal';
type AccessRole='admin'|'pending'|'denied';
export default function AccessWorkspace({admins,pending,removed,candidates,currentUserId}:{admins:AccessUser[];pending:AccessUser[];removed:AccessUser[];candidates:AccessCandidate[];currentUserId:string}){
 const [query,setQuery]=useState(''),[tab,setTab]=useState('admins'),[target,setTarget]=useState<AccessUser|null>(null),[role,setRole]=useState<AccessRole>('admin'),[certified,setCertified]=useState(false),[isPublic,setIsPublic]=useState(false),[adding,setAdding]=useState(false),[memberQuery,setMemberQuery]=useState(''),[choice,setChoice]=useState<AccessCandidate|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [busy,startTransition]=useTransition(),router=useRouter();
 const people=tab==='pending'?pending:tab==='admins'?admins:removed;
 const shown=people.filter(p=>`${p.name} ${p.email} ${p.member?.memberName??''}`.toLowerCase().includes(query.toLowerCase()));
 const matches=memberQuery.trim().length<2?[]:candidates.filter(c=>`${c.name} ${c.email}`.toLowerCase().includes(memberQuery.trim().toLowerCase())).slice(0,8);
 const canCertify=role==='admin'&&Boolean(target?.member?.photoUrl);
 function edit(user:AccessUser){setError('');setTarget(user);setRole(user.role as AccessRole);setCertified(Boolean(user.member?.communityAdmin));setIsPublic(Boolean(user.member?.profilePublic));}
 function run(action:(data:FormData)=>Promise<{error?:string;notice?:string}>,data:FormData,success:string,done:()=>void){startTransition(async()=>{setError('');const result=await action(data);if(result.error){setError(result.error);return;}done();setNotice(result.notice??success);router.refresh();});}
 function save(){if(!target)return;const data=new FormData();data.set('userId',target.id);data.set('role',role);if(role==='admin'){data.set('certified',String(certified));if(target.member)data.set('public',String(isPublic));}run(changeAccessAction,data,role==='admin'?`${target.name}’s access is saved.`:role==='pending'?`${target.name} is awaiting approval.`:`Administrator access removed for ${target.name}.`,()=>setTarget(null));}
 function add(){if(!choice)return;const data=new FormData();data.set('email',choice.email);run(inviteAccessAction,data,`${choice.name} now has administrator access.`,()=>{setAdding(false);setChoice(null);setMemberQuery('');setTab('admins');});}
 const person=(p:AccessUser)=><span className="access-person"><Avatar name={p.member?.memberName||p.name} src={p.avatarUrl||DEFAULT_HEADSHOT}/><span><strong>{p.member?.memberName||p.name}{p.member?.communityAdmin&&<VerifiedSeal size={16}/>}</strong>{p.member?.communityAdmin&&<small>Community admin</small>}</span></span>;
 return <div className="access-workspace admin-stack">
 <PageHeader title="Access management" description="Add administrators from your members and certify community admins." action={<Button variant="primary" onClick={()=>{setError('');setAdding(true);}}><UserPlus size={16}/>Add admin</Button>}/>
 <Toolbar><SearchField label="Search access" placeholder="Search names or email addresses…" value={query} onChange={e=>setQuery(e.target.value)}/></Toolbar>
 <Tabs label="Access lists" value={tab} onValueChange={setTab} items={[{value:'admins',content:null,label:<>Administrators <Badge>{admins.length}</Badge></>},{value:'pending',content:null,label:<>Requests <Badge>{pending.length}</Badge></>},{value:'removed',content:null,label:<>No access <Badge>{removed.length}</Badge></>}]}/>
 <div className="admin-table-frame"><DataTable label={tab==='pending'?'Pending access requests':tab==='admins'?'Administrators':'Accounts without access'} rows={shown} rowKey={p=>p.id} columns={[
 {key:'actions',label:'Edit',render:p=><IconButton label={`Edit access for ${p.name}`} disabled={busy} title={p.id===currentUserId?'Certify yourself; your own access level cannot be changed':'Edit access'} onClick={()=>edit(p)}><Pencil size={16}/></IconButton>},
 {key:'name',label:'Person',sortValue:p=>(p.member?.memberName||p.name).toLowerCase(),render:person},
 {key:'email',label:'Email',sortValue:p=>p.email,render:p=>p.email},
 {key:'member',label:'Member profile',sortValue:p=>p.member?(p.member.photoUrl?2:1):0,render:p=>p.member?<span className="admin-inline"><Badge tone="success">Member</Badge>{!p.member.photoUrl&&<Badge tone="warning">No photo</Badge>}{p.member.profilePublic&&<Badge>Public</Badge>}{p.member.publicSlug&&<a className="ui-button ui-button-ghost" href={`/members/${p.member.publicSlug}`} target="_blank" rel="noopener noreferrer">Profile<ArrowUpRight size={14} aria-hidden/></a>}</span>:<Badge tone="warning">Not a member</Badge>},
 {key:'status',label:'Access',sortValue:p=>p.role,render:p=><Badge tone={p.role==='admin'?'success':p.role==='pending'?'warning':'neutral'}>{p.accessProtected?'Super admin':p.role==='admin'?'Admin':p.role==='pending'?'Pending':'No access'}</Badge>},
 {key:'date',label:'Joined / requested',sortValue:p=>p.createdAt??'',render:p=>p.createdAt?new Date(p.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Not recorded'}
 ]}/>{!shown.length&&<EmptyState title={query?'No matching people':tab==='pending'?'No pending requests':tab==='removed'?'No removed accounts':'No administrators found'} description={query?'Try another name or email address.':tab==='pending'?'New access requests will appear here for review.':tab==='removed'?'People whose access is removed remain here so it can be restored.':'Add an administrator from your members.'}/>}</div>
 <p className="admin-muted access-note"><ShieldCheck size={16}/>Administrators can use the entire workspace, and must be members first. Only super admins can manage access.</p>
 <Toast message={notice} onDismiss={()=>setNotice('')}/>
 <Dialog open={!!target} onOpenChange={open=>{if(!open&&!busy){setTarget(null);setError('');}}} title="Edit administrator rights" description={target?`${target.member?.memberName||target.name} · ${target.email}`:''}>
 <div className="admin-stack">
 {target?.id===currentUserId?<Alert title="Your account">You cannot change your own access level. You can certify yourself as a community admin.</Alert>:target?.accessProtected?<Alert title="Super admin">Super admins keep administrator access. You can still certify them as a community admin.</Alert>:<Select label="Access level" value={role} onValueChange={value=>setRole(value as AccessRole)} options={[{value:'admin',label:'Admin · full workspace access'},{value:'pending',label:'Pending · awaiting approval'},{value:'denied',label:'No access · remove admin rights'}]}/>}
 {role==='admin'&&!target?.member&&!target?.accessProtected&&<Alert title="Not a member yet" tone="danger">Only members can become administrators. Ask them to join the community first.</Alert>}
 {role==='admin'&&<><Switch label="Certified community admin" checked={certified&&canCertify} disabled={!canCertify} onCheckedChange={setCertified}/><p className="admin-muted">{canCertify?'Shows a blue verified seal and a “Community admin” badge next to their name on their public profile.':!target?.member?'They need a member profile before they can be certified. Admins without one are prompted to complete it.':'They need a profile photo before they can be certified. They are prompted to add one in the workspace.'}</p><Switch label="Public profile" checked={isPublic&&Boolean(target?.member)} disabled={!target?.member} onCheckedChange={setIsPublic}/><p className="admin-muted">{target?.member?(target.member.publicSlug?`Anyone can see physical-io.com/members/${target.member.publicSlug} while this is on.`:'Publishes their member profile at physical-io.com/members/… for anyone to see.'):'They need a member profile before it can be published.'}</p></>}
 {role!=='admin'&&target?.member?.communityAdmin&&<p className="admin-muted">Removing admin access also removes their community admin certification.</p>}
 {error&&<Alert tone="danger" title="Unable to update access">{error}</Alert>}
 <div className="admin-actions"><Button disabled={busy} onClick={()=>setTarget(null)}>Cancel</Button><Button variant={role==='denied'?'danger':'primary'} busy={busy} disabled={role===target?.role&&(role!=='admin'||(certified===Boolean(target?.member?.communityAdmin)&&isPublic===Boolean(target?.member?.profilePublic)))} onClick={save}>{role==='denied'?'Remove access':'Save access'}</Button></div>
 </div>
 </Dialog>
 <Dialog open={adding} onOpenChange={open=>{if(!busy){setAdding(open);setError('');setChoice(null);}}} title="Add an administrator" description="Choose a member. Members without an account receive an invitation to set their password.">
 <form className="admin-stack" onSubmit={e=>{e.preventDefault();if(!busy)add();}}>
 <SearchField label="Search members" placeholder="Search members by name or email…" value={memberQuery} onChange={e=>{setMemberQuery(e.target.value);setChoice(null);}} autoFocus/>
 <div className="access-candidates" role="listbox" aria-label="Matching members">{matches.map(c=><button type="button" role="option" aria-selected={choice?.email===c.email} key={c.email} className="access-candidate" onClick={()=>setChoice(c)}><Avatar name={c.name} src={c.photoUrl||DEFAULT_HEADSHOT}/><span><strong>{c.name}</strong><small>{c.email}</small></span><small>{c.hasAccount?'Has an account':'Will be invited'}</small></button>)}</div>
 {memberQuery.trim().length>=2&&!matches.length&&<p className="admin-muted">No members match. Only members can become administrators; ask them to join at physical-io.com/join first.</p>}
 {error&&<Alert tone="danger" title="Could not add administrator">{error}</Alert>}
 <div className="admin-actions"><Button disabled={busy} onClick={()=>setAdding(false)}>Cancel</Button><Button type="submit" variant="primary" busy={busy} disabled={!choice}>{choice&&!choice.hasAccount?'Invite as admin':'Add as admin'}</Button></div>
 </form>
 </Dialog>
 </div>;
}
