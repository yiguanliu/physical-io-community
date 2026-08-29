import type { Metadata } from "next";
import RobotShowcase from "@/components/demo/RobotShowcase";
import "./demo.css";

export const metadata: Metadata = {
  title: "physical·io OS — disk concept",
  description:
    "A concept demo in a flat black-and-white classic-Macintosh style: insert a disk into the Mac to boot a program and browse its content.",
  robots: { index: false },
};

export default function DemoPage() {
  return <RobotShowcase />;
}
