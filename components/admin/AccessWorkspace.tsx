'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Pencil,UserPlus,ShieldCheck} from 'lucide-react';
import {PageHeader,Toolbar,SearchField,Tabs,Badge,Button,IconButton,DataTable,EmptyState,Dialog,Alert,Toast,Field,Select} from '@/workspace-ui/src';
import {changeAccessAction,inviteAccessAction} from '@/app/admin/actions';
import type {AdminProfile} from '@/lib/auth/profiles';
type AccessRole='admin'|'pending'|'denied';
export default function AccessWorkspace({admins,pending,removed,currentUserId}:{admins:AdminProfile[];pending:AdminProfile[];removed:AdminProfile[];currentUserId:string}){
 const [query,setQuery]=useState(''),[tab,setTab]=useState('pending'),[target,setTarget]=useState<AdminProfile|null>(null),[role,setRole]=useState<AccessRole>('admin'),[invite,setInvite]=useState(false),[email,setEmail]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [busy,startTransition]=useTransition(),router=useRouter();
 const people=tab==='pending'?pending:tab==='admins'?admins:removed;
 const shown=people.filter(p=>`${p.name} ${p.email}`.toLowerCase().includes(query.toLowerCase()));
 function edit(user:AdminProfile){setError('');setTarget(user);setRole(user.role as AccessRole);}
 function save(){if(!target)return;const person=target;startTransition(async()=>{setError('');try{const data=new FormData();data.set('userId',person.id);data.set('role',role);await changeAccessAction(data);setTarget(null);setNotice(role==='admin'?`${person.name} has administrator access.`:role==='pending'?`${person.name} is awaiting approval.`:`Administrator access removed for ${person.name}.`);router.refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to update access. Please retry.');}});}
 function sendInvite(){startTransition(async()=>{setError('');try{const data=new FormData();data.set('email',email);await inviteAccessAction(data);setInvite(false);setEmail('');setNotice(`Invitation sent to ${email}.`);setTab('admins');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to send invitation.');router.refresh();}});}
 return <div className="access-workspace admin-stack">
 <PageHeader title="Access management" description="Review requests and manage who can use your workspace." action={<Button variant="primary" onClick={()=>{setError('');setInvite(true);}}><UserPlus size={16}/>Invite admin</Button>}/>
 <Toolbar><SearchField label="Search access" placeholder="Search names or email addresses…" value={query} onChange={e=>setQuery(e.target.value)}/></Toolbar>
 <Tabs label="Access lists" value={tab} onValueChange={setTab} items={[{value:'pending',content:null,label:<>Requests <Badge>{pending.length}</Badge></>},{value:'admins',content:null,label:<>Administrators <Badge>{admins.length}</Badge></>},{value:'removed',content:null,label:<>No access <Badge>{removed.length}</Badge></>}]}/>
 <div className="admin-table-frame"><DataTable label={tab==='pending'?'Pending access requests':tab==='admins'?'Administrators':'Accounts without access'} rows={shown} rowKey={p=>p.id} columns={[
 {key:'actions',label:'Edit',render:p=><IconButton label={`Edit access for ${p.name}`} disabled={busy||p.id===currentUserId||p.accessProtected} title={p.id===currentUserId?'You cannot change your own access':p.accessProtected?'Protected by workspace allowlist':'Edit access'} onClick={()=>edit(p)}><Pencil size={16}/></IconButton>},
 {key:'name',label:'Person',render:p=><span>{p.name}</span>},
 {key:'email',label:'Email',render:p=>p.email},
 {key:'status',label:'Access',render:p=><Badge tone={p.role==='admin'?'success':p.role==='pending'?'warning':'neutral'}>{p.role==='admin'?'Admin':p.role==='pending'?'Pending':'No access'}</Badge>},
 {key:'date',label:'Joined / requested',render:p=>p.createdAt?new Date(p.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Not recorded'}
 ]}/>{!shown.length&&<EmptyState title={query?'No matching people':tab==='pending'?'No pending requests':tab==='removed'?'No removed accounts':'No administrators found'} description={query?'Try another name or email address.':tab==='pending'?'New access requests will appear here for review.':tab==='removed'?'People whose access is removed remain here so it can be restored.':'Invite an administrator or refresh the list.'}/>}</div>
 <p className="admin-muted access-note"><ShieldCheck size={16}/>Administrators can use the entire workspace. Pending and No access accounts cannot.</p>
 <Toast message={notice} onDismiss={()=>setNotice('')}/>
 <Dialog open={!!target} onOpenChange={open=>{if(!open&&!busy){setTarget(null);setError('');}}} title="Edit administrator rights" description={target?`${target.name} · ${target.email}`:''}>
 <div className="admin-stack"><Select label="Access level" value={role} onValueChange={value=>setRole(value as AccessRole)} options={[{value:'admin',label:'Admin · full workspace access'},{value:'pending',label:'Pending · awaiting approval'},{value:'denied',label:'No access · remove admin rights'}]}/><p className="admin-muted">{role==='admin'?'This grants access to all administrator tools.':'This removes access to administrator tools while keeping the account and its records.'}</p>{error&&<Alert tone="danger" title="Unable to update access">{error}</Alert>}<div className="admin-actions"><Button disabled={busy} onClick={()=>setTarget(null)}>Cancel</Button><Button variant={role==='denied'?'danger':'primary'} busy={busy} disabled={role===target?.role} onClick={save}>{role==='denied'?'Remove access':'Save access'}</Button></div></div>
 </Dialog>
 <Dialog open={invite} onOpenChange={open=>{if(!busy){setInvite(open);setError('');}}} title="Invite an administrator" description="Send a secure invitation to a new email address."><form className="admin-stack" onSubmit={e=>{e.preventDefault();if(!busy)sendInvite();}}><Field label="Email address" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/><p className="admin-muted">The invitee will receive full administrator access and a link to set their password. For an existing account, use Edit in the lists.</p>{error&&<Alert tone="danger" title="Invitation could not be completed">{error}</Alert>}<div className="admin-actions"><Button disabled={busy} onClick={()=>setInvite(false)}>Cancel</Button><Button type="submit" variant="primary" busy={busy} disabled={!email.trim()}>Send invitation</Button></div></form></Dialog>
 </div>;
}
