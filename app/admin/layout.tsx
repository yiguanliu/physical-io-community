import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin | Physical I/O",
  description: "Private workspace for Physical I/O members, email campaigns and outreach.",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
