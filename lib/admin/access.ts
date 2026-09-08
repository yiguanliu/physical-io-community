import { ADMIN_ROLE, PENDING_ROLE, isAllowlistedAdmin } from "@/lib/auth/allowlist";
import { listAdminProfiles, setAdminRole } from "@/lib/auth/profiles";
import { writeAudit } from "@/lib/admin/store";

export async function listAccessUsers() {
  const users = (await listAdminProfiles()).map(user=>({...user,accessProtected:isAllowlistedAdmin(user.email)}));
  return {
    admins: users.filter((row) => row.role === ADMIN_ROLE),
    pending: users.filter((row) => row.role === PENDING_ROLE),
    removed: users.filter(row=>row.role!==ADMIN_ROLE&&row.role!==PENDING_ROLE),
  };
}

export async function setUserRole(input: {
  userId: string;
  role: typeof ADMIN_ROLE | typeof PENDING_ROLE | "denied";
  actor: { id: string; name: string };
}) {
  if (input.userId === input.actor.id) throw new Error("You cannot change your own access.");
  const users = await listAdminProfiles();
  const target = users.find((user) => user.id === input.userId);
  if (!target) throw new Error("User not found.");

  if(input.role!==ADMIN_ROLE&&isAllowlistedAdmin(target.email))throw new Error('This administrator is protected by the workspace allowlist.');
  if(input.role!==ADMIN_ROLE&&target.role===ADMIN_ROLE&&users.filter(user=>user.role===ADMIN_ROLE).length<=1)throw new Error('Keep at least one administrator.');
  await setAdminRole(input.userId, input.role);
  await writeAudit({
    actorUserId: input.actor.id,
    actorName: input.actor.name,
    action: input.role === "denied" ? "access.denied" : input.role === ADMIN_ROLE ? "access.approved" : "access.pending",
    entityType: "user",
    entityId: input.userId,
    summary: `${input.role === "denied" ? "Declined" : input.role === ADMIN_ROLE ? "Approved" : "Set pending"} admin access for ${target.email}`,
  });
}

export async function inviteAdministrator(email:string,actor:{id:string;name:string}){
 const {getSupabaseAdminClient}=await import('@/utils/supabase/admin');
 const {SITE_URL}=await import('@/lib/site');
 const users=await listAdminProfiles();
 if(users.some(user=>user.email.toLowerCase()===email.toLowerCase()))throw new Error('This email already has an account. Change its access from the lists instead.');
 const supabase=getSupabaseAdminClient();
 const base=(process.env.NEXT_PUBLIC_SITE_URL||SITE_URL).replace(/\/$/,'');
 const {data,error}=await supabase.auth.admin.inviteUserByEmail(email,{redirectTo:`${base}/admin/reset-password`});
 if(error)throw error;
 if(!data.user)throw new Error('The invitation provider did not return an account. Refresh the list before retrying.');
 try{await setAdminRole(data.user.id,ADMIN_ROLE);}catch{throw new Error('Invitation sent, but administrator access could not be assigned. Find the account under Requests and approve it.');}
 await writeAudit({actorUserId:actor.id,actorName:actor.name,action:'access.invited',entityType:'user',entityId:data.user.id,summary:`Invited ${email} as administrator`});
}
