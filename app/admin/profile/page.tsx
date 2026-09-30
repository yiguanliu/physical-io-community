import AdminWorkspace from '@/components/admin/AdminMockup';
import UserDetails from '@/components/admin/UserDetails';
import {requireAdmin} from '@/lib/auth/session';
import {adminOnboarding} from '@/lib/admin/access';
import '@/workspace-ui/src/styles.css';
import '../ohi.css';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export default async function UserDetailsPage(){const admin=await requireAdmin();return <AdminWorkspace initialPage="User details" onboarding={await adminOnboarding(admin.email)} userPage={<UserDetails name={admin.name} email={admin.email} avatarUrl={admin.avatarUrl}/>}/>;}
