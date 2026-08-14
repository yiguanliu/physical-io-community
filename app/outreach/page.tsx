import type { Metadata } from "next";
import { OutreachDashboard } from "@/components/outreach/outreach-dashboard";
import { getDashboardData } from "@/lib/outreach/dashboard-data";
import "./outreach.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Outreach Pipeline | Physical I/O",
  description: "Physical I/O outreach pipeline and message drafting workspace.",
  robots: { index: false, follow: false },
};

export default async function OutreachPage() {
  const data = await getDashboardData();

  return (
    <main className="outreach-app min-h-screen">
      <OutreachDashboard
        dbReady={data.dbReady}
        error={data.error}
        initialLeads={data.leads}
        templates={data.templates}
        memoryDocuments={data.memoryDocuments}
        senderPersonas={data.senderPersonas}
      />
    </main>
  );
}
