import type { Metadata } from "next";
import { Suspense } from "react";
import LogoMark from "@/components/LogoMark";
import LoginForm from "@/components/admin/login-form";
import { getAdminSession, sessionRole } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/allowlist";
import { isEphemeralDatabase } from "@/lib/db/client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Admin sign in | Physical I/O",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getAdminSession();
  if (session?.user && canAccessAdmin(session.user.email, sessionRole(session))) redirect("/admin");
  const params = await searchParams;
  const pending =
    params.status === "pending" ||
    (sessionRole(session) === "pending" && !canAccessAdmin(session?.user?.email ?? "", sessionRole(session)));
  return (
    <main className="admin-app admin-auth">
      <section className="admin-auth-card">
        <div className="admin-auth-brand">
          <LogoMark />
          <span>PHYSICAL I/O</span>
        </div>
        <h1>Sign in to admin</h1>
        <p>Use your administrator email and password. New users can request access.</p>
        {isEphemeralDatabase() ? (
          <div className="admin-auth-warning">
            <strong>No persistent database connected</strong>
            <span>
              This deployment stores data on the machine that happens to serve each request, so accounts cannot be
              created. Set <code>TURSO_DATABASE_URL</code> and <code>TURSO_AUTH_TOKEN</code>, then redeploy.
            </span>
          </div>
        ) : null}
        <Suspense>
          <LoginForm initialStatus={pending ? "pending" : undefined} />
        </Suspense>
      </section>
    </main>
  );
}
