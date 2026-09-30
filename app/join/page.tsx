import type {Metadata} from 'next';
import {cookies} from 'next/headers';
import JoinFlow,{type JoinPrefill} from './JoinFlow';
import {findEpisode} from '@/lib/events/catalog';
import {ownedRegistration,ownerCookie} from '@/lib/rsvp/service';
import {getMember} from '@/lib/auth/member';
import {canAccessAdmin} from '@/lib/auth/allowlist';
import {adminRoleForUser} from '@/lib/auth/profiles';
export const metadata:Metadata={title:'Join the community | Physical I/O',alternates:{canonical:'/join'},description:'Find your people in Physical AI. Join the Physical I/O community.'};
// Badge categories that have a direct counterpart in the join form's role list.
const ROLE_FOR_CATEGORY:Record<string,string>={Designer:'Designer / Creative',Engineer:'Engineer / Developer',Founder:'Founder / Entrepreneur',Investor:'Investor',Operator:'Product / Strategy'};
// Prefill only for the device that completed the RSVP; a shared ticket link never reveals the email.
async function rsvpPrefill(eventSlug:string|undefined):Promise<JoinPrefill|undefined>{
 const episode=eventSlug?findEpisode(eventSlug):null;if(!episode)return;
 try{
  const registration=await ownedRegistration(episode.slug,(await cookies()).get(ownerCookie(episode.slug))?.value);if(!registration)return;
  const [firstName='',...rest]=registration.fullName.split(/\s+/);
  return {eventName:`Episode ${episode.number}: ${episode.title}`,rsvpEvent:episode.slug,email:registration.email,firstName:registration.firstName||firstName,lastName:registration.lastName||rest.join(' '),linkedin:registration.linkedin,jobTitle:registration.jobTitle,company:registration.organisation,role:ROLE_FOR_CATEGORY[registration.category]??''};
 }catch{console.error('RSVP prefill unavailable');return;}
}
// Admin onboarding uses the same form, tied to the signed-in admin account's email.
// Reads the role only: getAdminSession() would assign roles to non-admin visitors.
async function adminPrefill():Promise<JoinPrefill|undefined>{
 const user=await getMember();const email=user?.email?.trim().toLowerCase();
 if(!user||!email||!canAccessAdmin(email,adminRoleForUser(user)))return;
 const name=typeof user.user_metadata?.name==='string'?user.user_metadata.name.trim():'';
 const [firstName='',...rest]=name.split(/\s+/);
 return {adminOnboarding:true,email,firstName,lastName:rest.join(' ')};
}
export default async function JoinPage({searchParams}:{searchParams:Promise<{status?:string;event?:string;onboarding?:string}>}){const params=await searchParams;const prefill=params.onboarding==='admin'?await adminPrefill():await rsvpPrefill(params.event);return <JoinFlow profileRequired={params.status==='profile_required'} prefill={prefill}/>;}
