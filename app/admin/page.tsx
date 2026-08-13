import type { Metadata } from "next";
import AdminMockup from "@/components/admin/AdminMockup";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin UI Mockup | Physical I/O",
  description: "Interactive frontend mockup for Physical I/O member and outreach operations.",
  robots: { index: false, follow: false },
};

export default function AdminMockupPage() {
  return <AdminMockup />;
}
