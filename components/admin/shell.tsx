"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import LogoMark from "@/components/LogoMark";
import { NAV, labelForPath, parentPath } from "@/components/admin/nav";
import { Icon, initials } from "@/components/admin/ui";
import { signOutAdminAction } from "@/app/admin/auth-actions";

type TextSizeOption = "10pt" | "11pt" | "12pt";
type FontOption = "grotesk" | "system" | "readable";

type AdminPreferences = {
  textSize: TextSizeOption;
  font: FontOption;
};

type AdminPreferenceStyle = CSSProperties & {
  "--admin-type-scale": string;
  "--admin-font-family": string;
};

const ADMIN_PREFERENCES_KEY = "physical-io-admin-preferences";

const DEFAULT_PREFERENCES: AdminPreferences = {
  textSize: "10pt",
  font: "grotesk",
};

const TEXT_SIZE_OPTIONS: Array<{ value: TextSizeOption; label: string; scale: number }> = [
  { value: "10pt", label: "10pt", scale: 1 },
  { value: "11pt", label: "11pt", scale: 1.1 },
  { value: "12pt", label: "12pt", scale: 1.2 },
];

const FONT_OPTIONS: Array<{ value: FontOption; label: string; stack: string }> = [
  { value: "grotesk", label: "Grotesk", stack: "var(--font)" },
  {
    value: "system",
    label: "System",
    stack: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Helvetica, Arial, sans-serif",
  },
  {
    value: "readable",
    label: "Readable",
    stack: "Verdana, Tahoma, \"Segoe UI\", Arial, sans-serif",
  },
];

function isTextSizeOption(value: unknown): value is TextSizeOption {
  return TEXT_SIZE_OPTIONS.some((option) => option.value === value);
}

function isFontOption(value: unknown): value is FontOption {
  return FONT_OPTIONS.some((option) => option.value === value);
}

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
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<AdminPreferences>(DEFAULT_PREFERENCES);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const view = labelForPath(pathname);
  const parent = parentPath(pathname);
  const textSize = TEXT_SIZE_OPTIONS.find((option) => option.value === preferences.textSize) ?? TEXT_SIZE_OPTIONS[0];
  const font = FONT_OPTIONS.find((option) => option.value === preferences.font) ?? FONT_OPTIONS[0];
  const preferenceStyle = useMemo<AdminPreferenceStyle>(
    () => ({
      "--admin-type-scale": String(textSize.scale),
      "--admin-font-family": font.stack,
    }),
    [font.stack, textSize.scale],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADMIN_PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AdminPreferences>;
        setPreferences({
          textSize: isTextSizeOption(parsed.textSize) ? parsed.textSize : DEFAULT_PREFERENCES.textSize,
          font: isFontOption(parsed.font) ? parsed.font : DEFAULT_PREFERENCES.font,
        });
      }
    } catch {
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem(ADMIN_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences, preferencesReady]);

  async function signOut() {
    await signOutAdminAction();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className="admin-app" style={preferenceStyle}>
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
            <div className="admin-preferences">
              <button
                className="admin-icon-button admin-preferences-toggle"
                type="button"
                aria-label="Text preferences"
                aria-expanded={preferencesOpen}
                aria-controls="admin-preferences-panel"
                title="Text preferences"
                onClick={() => setPreferencesOpen((open) => !open)}
              >
                <Icon name="settings" size={17} />
              </button>
              {preferencesOpen ? (
                <section className="admin-preferences-panel" id="admin-preferences-panel" aria-label="Text preferences">
                  <div>
                    <strong>Text size</strong>
                    <div className="admin-segmented" role="group" aria-label="Text size">
                      {TEXT_SIZE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={preferences.textSize === option.value ? "active" : ""}
                          aria-pressed={preferences.textSize === option.value}
                          onClick={() => setPreferences((current) => ({ ...current, textSize: option.value }))}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong>Font</strong>
                    <div className="admin-font-options" role="group" aria-label="Font">
                      {FONT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={preferences.font === option.value ? "active" : ""}
                          aria-pressed={preferences.font === option.value}
                          onClick={() => setPreferences((current) => ({ ...current, font: option.value }))}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
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
