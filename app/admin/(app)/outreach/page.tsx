import type { Metadata } from "next";
import { OutreachDashboard } from "@/components/outreach/outreach-dashboard";
import { getDashboardData } from "@/lib/outreach/dashboard-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Outreach | Admin | Physical I/O",
  description: "Sponsor outreach CRM inside the Physical I/O admin workspace.",
  robots: { index: false, follow: false },
};

export default async function AdminOutreachPage() {
  const data = await getDashboardData();

  return (
    <div className="outreach-app admin-outreach-page">
      <OutreachDashboard
        embedded
        dbReady={data.dbReady}
        error={data.error}
        initialLeads={data.leads}
        templates={data.templates}
        memoryDocuments={data.memoryDocuments}
        senderPersonas={data.senderPersonas}
      />
    </div>
  );
}
