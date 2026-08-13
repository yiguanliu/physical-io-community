import type { IconName } from "./ui";

export type { IconName };

export const NAV = [
  { href: "/admin", label: "Overview", icon: "grid" as const },
  { href: "/admin/members", label: "Members", icon: "users" as const },
  { href: "/admin/outreach", label: "Outreach", icon: "target" as const },
  { href: "/admin/campaigns", label: "Communications", icon: "mail" as const },
  { href: "/admin/events", label: "Events", icon: "calendar" as const },
  { href: "/admin/access", label: "Access", icon: "check" as const },
];

export function labelForPath(pathname: string) {
  return (
    NAV.find((item) => (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)))?.label ??
    "Overview"
  );
}

/** One level up in the admin hierarchy, stopping at the workspace root. */
export function parentPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;
  return `/${segments.slice(0, -1).join("/")}`;
}
