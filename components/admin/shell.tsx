"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import LogoMark from "@/components/LogoMark";
import { NAV, labelForPath, parentPath } from "@/components/admin/nav";
import { Icon, initials } from "@/components/admin/ui";
import { signOutAdminAction } from "@/app/admin/auth-actions";

export default function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const view = labelForPath(pathname);
  const parent = parentPath(pathname);

  async function signOut() {
    await signOutAdminAction();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className="admin-app">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-brand">
          <LogoMark />
          <span>PHYSICAL I/O</span>
        </div>
        <nav aria-label="Admin navigation">
          <p className="admin-nav-label">Workspace</p>
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setSidebarOpen(false)}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-system">
            <span className="live-dot" />
            <div>
              <strong>Admin workspace</strong>
              <small>Members, email, outreach</small>
            </div>
          </div>
          <button className="admin-profile" onClick={signOut} type="button">
            <span>{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>Sign out</small>
            </div>
            <Icon name="dots" />
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu" aria-label="Toggle navigation" onClick={() => setSidebarOpen((open) => !open)}>
            <span />
            <span />
            <span />
          </button>
          <div className="admin-breadcrumb">
            {parent ? (
              <Link
                className="admin-breadcrumb-back"
                href={parent}
                aria-label={`Back to ${labelForPath(parent)}`}
                title={`Back to ${labelForPath(parent)}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon name="arrow-left" size={16} />
              </Link>
            ) : null}
            <strong>{view}</strong>
          </div>
          <div className="admin-top-actions">
            <Link className="admin-search" href="/admin/members">
              <Icon name="search" />
              <span>Search members</span>
            </Link>
            <Link className="admin-primary" href="/admin/campaigns/new">
              <Icon name="plus" size={16} />
              New campaign
            </Link>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </section>
    </main>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-page-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
