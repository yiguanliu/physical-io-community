import type { Metadata } from "next";
import { Suspense } from "react";
import LogoMark from "@/components/LogoMark";
import LoginForm from "@/components/admin/login-form";
import { getAdminSession, hasAdminUsers } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Admin sign in | Physical I/O",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session?.user) redirect("/admin");
  const setup = !(await hasAdminUsers());
  return (
    <main className="admin-app admin-auth">
      <section className="admin-auth-card">
        <div className="admin-auth-brand">
          <LogoMark />
          <span>PHYSICAL I/O</span>
        </div>
        <h1>Sign in to admin</h1>
        <p>
          {setup
            ? "If this workspace is empty, signing in with an allowed administrator email will create the first account."
            : "Use your administrator email. Public signup is disabled."}
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
