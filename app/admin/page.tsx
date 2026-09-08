import AdminWorkspace from "@/components/admin/AdminMockup";
import { requireAdmin } from "@/lib/auth/session";
import "@/workspace-ui/src/styles.css";
import "./ohi.css";
export const dynamic="force-dynamic";
export default async function AdminPage({searchParams}:{searchParams:Promise<{view?:string}>}){await requireAdmin();const {view}=await searchParams;const initialPage=view&&['Overview','Members','Outreach','Communications','Content','Events','Automations'].includes(view)?view:'Overview';return <AdminWorkspace initialPage={initialPage}/>;}
