import AdminWorkspace from '@/components/admin/AdminMockup';
import AccessWorkspace from '@/components/admin/AccessWorkspace';
import {requireAdmin} from '@/lib/auth/session';
import {listAccessUsers} from '@/lib/admin/access';
import {isSuperAdmin} from '@/lib/auth/allowlist';
import {adminOnboarding} from '@/lib/admin/access';
import {EmptyState} from '@/workspace-ui/src';
import '@/workspace-ui/src/styles.css';
import '../ohi.css';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export default async function AccessPage(){const admin=await requireAdmin();const onboarding=await adminOnboarding(admin.email);
 // Only super admins manage who has access; other admins see why the page is unavailable.
 if(!isSuperAdmin(admin.email))return <AdminWorkspace initialPage="Access" onboarding={onboarding} accessPage={<EmptyState title="Super admins only" description="Access management is limited to super admins. Ask a founder if someone needs administrator access."/>}/>;
 const users=await listAccessUsers();return <AdminWorkspace initialPage="Access" onboarding={onboarding} accessPage={<AccessWorkspace {...users} currentUserId={admin.id}/>}/>;}
