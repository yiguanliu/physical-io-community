import type { IconName } from "./ui";

export type { IconName };

export const NAV = [
  { href: "/admin", label: "Overview", icon: "grid" as const },
  { href: "/admin/members", label: "Members", icon: "users" as const },
  { href: "/admin/outreach", label: "Outreach", icon: "target" as const },
  { href: "/admin/campaigns", label: "Communications", icon: "mail" as const },
  { href: "/admin/events", label: "Events", icon: "calendar" as const },
];
