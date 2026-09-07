import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./outreach.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OutreachLayout({ children }: { children: ReactNode }) {
  return children;
}
