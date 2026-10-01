import { ADMIN_ROLE, PENDING_ROLE, isAllowlistedAdmin } from "@/lib/auth/allowlist";
import { listAdminProfiles, setAdminRole, type AdminProfile } from "@/lib/auth/profiles";
import { writeAudit } from "@/lib/admin/store";
import { database } from "@/lib/admin/database";
import { uniqueProfileSlug } from "@/lib/members/slug";

export type MemberLink = { memberId: string; memberName: string; photoUrl: string; communityAdmin: boolean; publicSlug: string | null; profilePublic: boolean } | null;
export type AccessUser = AdminProfile & { member: MemberLink };
export type AccessCandidate = { id: string; name: string; email: string; photoUrl: string; hasAccount: boolean };

async function membersByEmail(emails: string[]) {
  const result = await database().query(
    "select id,email_normalized,full_name,photo_url,community_admin,public_slug,profile_public from public.members where email_normalized=any($1::text[]) and status<>'archived'",
    [emails.map((email) => email.trim().toLowerCase())],
  );
  return new Map(result.rows.map((m) => [m.email_normalized as string, { memberId: m.id, memberName: m.full_name, photoUrl: m.photo_url, communityAdmin: m.community_admin, publicSlug: m.public_slug, profilePublic: m.profile_public } as NonNullable<MemberLink>]));
}

async function memberFor(email: string) {
  return (await membersByEmail([email])).get(email.trim().toLowerCase()) ?? null;
}

export async function listAccessUsers() {
  const profiles = await listAdminProfiles();
  const members = await membersByEmail(profiles.map((user) => user.email));
  const users: AccessUser[] = profiles.map((user) => {
    const member = members.get(user.email) ?? null;
    // The member headshot is the person's one photo; fall back to a legacy admin headshot.
    return { ...user, accessProtected: isAllowlistedAdmin(user.email), avatarUrl: member?.photoUrl || user.avatarUrl, member };
  });
  const adminEmails = new Set(users.filter((user) => user.role === ADMIN_ROLE).map((user) => user.email));
  const accounts = new Set(users.map((user) => user.email));
  const candidates = (await database().query("select full_name,email_normalized,photo_url from public.members where status<>'archived' order by full_name limit 5000")).rows
    .filter((m) => !adminEmails.has(m.email_normalized))
    .map((m): AccessCandidate => ({ id: m.email_normalized, name: m.full_name, email: m.email_normalized, photoUrl: m.photo_url, hasAccount: accounts.has(m.email_normalized) }));
  return {
    admins: users.filter((row) => row.role === ADMIN_ROLE),
    pending: users.filter((row) => row.role === PENDING_ROLE),
    removed: users.filter((row) => row.role !== ADMIN_ROLE && row.role !== PENDING_ROLE),
    candidates,
  };
}

const MEMBER_FIRST = "Only members can become administrators. Ask them to join the community first, then add them here.";

export async function setUserRole(input: {
  userId: string;
  role: typeof ADMIN_ROLE | typeof PENDING_ROLE | "denied";
  actor: { id: string; name: string };
}) {
  if (input.userId === input.actor.id) throw new Error("You cannot change your own access.");
  const users = await listAdminProfiles();
  const target = users.find((user) => user.id === input.userId);
  if (!target) throw new Error("User not found.");

  if (input.role !== ADMIN_ROLE && isAllowlistedAdmin(target.email)) throw new Error("This administrator is protected by the workspace allowlist.");
  if (input.role !== ADMIN_ROLE && target.role === ADMIN_ROLE && users.filter((user) => user.role === ADMIN_ROLE).length <= 1) throw new Error("Keep at least one administrator.");
  const member = await memberFor(target.email);
  if (input.role === ADMIN_ROLE && target.role !== ADMIN_ROLE && !member && !isAllowlistedAdmin(target.email)) throw new Error(MEMBER_FIRST);
  await setAdminRole(input.userId, input.role);
  // Certification belongs to administrators only.
  if (input.role !== ADMIN_ROLE && member?.communityAdmin) await database().query("update public.members set community_admin=false,updated_at=now() where id=$1", [member.memberId]);
  await writeAudit({
    actorUserId: input.actor.id,
    actorName: input.actor.name,
    action: input.role === "denied" ? "access.denied" : input.role === ADMIN_ROLE ? "access.approved" : "access.pending",
    entityType: "user",
    entityId: input.userId,
    summary: `${input.role === "denied" ? "Declined" : input.role === ADMIN_ROLE ? "Approved" : "Set pending"} admin access for ${target.email}`,
  });
}

/** Adds an existing member as an administrator, inviting them first if they have no account yet. */
export async function grantAdminToMember(email: string, actor: { id: string; name: string }) {
  const normalized = email.trim().toLowerCase();
  if (!(await memberFor(normalized))) throw new Error(MEMBER_FIRST);
  const existing = (await listAdminProfiles()).find((user) => user.email === normalized);
  if (existing) {
    if (existing.role === ADMIN_ROLE) throw new Error("This member is already an administrator.");
    await setUserRole({ userId: existing.id, role: ADMIN_ROLE, actor });
    return { invited: false };
  }
  await inviteAdministrator(normalized, actor);
  return { invited: true };
}

export async function setCommunityAdmin(input: { userId: string; certified: boolean; actor: { id: string; name: string } }) {
  const target = (await listAdminProfiles()).find((user) => user.id === input.userId);
  if (!target) throw new Error("User not found.");
  const member = await memberFor(target.email);
  if (input.certified) {
    if (target.role !== ADMIN_ROLE) throw new Error("Only administrators can be certified as community admins.");
    if (!member) throw new Error("This administrator has not completed their member profile yet.");
    if (!member.photoUrl) throw new Error("This administrator needs a profile photo before they can be certified.");
  }
  if (!member || member.communityAdmin === input.certified) return;
  await database().query("update public.members set community_admin=$2,updated_at=now() where id=$1", [member.memberId, input.certified]);
  await writeAudit({
    actorUserId: input.actor.id,
    actorName: input.actor.name,
    action: input.certified ? "access.certified" : "access.uncertified",
    entityType: "member",
    entityId: member.memberId,
    summary: `${input.certified ? "Certified" : "Removed certification for"} ${target.email} as community admin`,
  });
}

/** Super admins publish or hide an administrator's member profile. Their access vouches for the address. */
export async function setAdminProfilePublic(input: { userId: string; isPublic: boolean; actor: { id: string; name: string } }) {
  const target = (await listAdminProfiles()).find((user) => user.id === input.userId);
  if (!target) throw new Error("User not found.");
  const member = await memberFor(target.email);
  if (input.isPublic) {
    if (target.role !== ADMIN_ROLE) throw new Error("Only administrators' profiles can be published from Access.");
    if (!member) throw new Error("This administrator has not completed their member profile yet.");
  }
  if (!member || member.profilePublic === input.isPublic) return;
  const client = await database().connect();
  try {
    await client.query("begin");
    const row = (await client.query("select full_name,public_slug from public.members where id=$1 for update", [member.memberId])).rows[0];
    const slug = row.public_slug ?? (input.isPublic ? await uniqueProfileSlug(client, row.full_name, member.memberId) : null);
    await client.query("update public.members set profile_public=$2,public_slug=$3,updated_at=now() where id=$1", [member.memberId, input.isPublic, slug]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  await writeAudit({
    actorUserId: input.actor.id,
    actorName: input.actor.name,
    action: input.isPublic ? "access.profile_public" : "access.profile_hidden",
    entityType: "member",
    entityId: member.memberId,
    summary: `${input.isPublic ? "Published" : "Hid"} the public profile of ${target.email}`,
  });
}

export async function inviteAdministrator(email:string,actor:{id:string;name:string}){
 const {getSupabaseAdminClient}=await import('@/utils/supabase/admin');
 const {SITE_URL}=await import('@/lib/site');
 if(!(await memberFor(email))&&!isAllowlistedAdmin(email))throw new Error(MEMBER_FIRST);
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

/** Onboarding state shown to an administrator until their member profile and headshot are complete. */
export async function adminOnboarding(email: string) {
  try {
    const member = await memberFor(email);
    return member ? (member.photoUrl ? null : "photo" as const) : "profile" as const;
  } catch { return null; }
}
