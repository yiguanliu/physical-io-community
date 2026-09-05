import AdminWorkspace from "@/components/admin/AdminMockup";
import { requireAdmin } from "@/lib/auth/session";
import "@/workspace-ui/src/styles.css";
import "./ohi.css";
export const dynamic="force-dynamic";
export default async function AdminPage(){await requireAdmin();return <AdminWorkspace/>;}
