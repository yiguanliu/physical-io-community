import AdminWorkspace from '@/components/admin/AdminMockup';
import AccessWorkspace from '@/components/admin/AccessWorkspace';
import {requireAdmin} from '@/lib/auth/session';
import {listAccessUsers} from '@/lib/admin/access';
import '@/workspace-ui/src/styles.css';
import '../ohi.css';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export default async function AccessPage(){const admin=await requireAdmin();const users=await listAccessUsers();return <AdminWorkspace initialPage="Access" accessPage={<AccessWorkspace {...users} currentUserId={admin.id}/>}/>;}
