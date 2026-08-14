import type { Metadata } from "next";
import MemberNetwork from "@/components/MemberNetwork";

export const metadata: Metadata = {
  title: "Member network | Physical I/O",
  description: "A visual prototype of the Physical I/O member network.",
  robots: { index: false, follow: false },
};

export default function NetworkPage() {
  return <MemberNetwork />;
}
