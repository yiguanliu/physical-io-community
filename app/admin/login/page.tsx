import type { Metadata } from "next";
import { Suspense } from "react";
import "@/workspace-ui/src/styles.css";
import "../ohi.css";
import LoginForm from "@/components/admin/login-form";
import { getAdminSession, sessionRole } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/allowlist";
import { hasSupabaseAdminEnv } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

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
  const hasAdminConfig = hasSupabaseAdminEnv();
  if (hasAdminConfig && session?.user && canAccessAdmin(session.user.email, sessionRole(session))) redirect("/admin");
  const params = await searchParams;
  // A sign-in cookie that no longer maps to a session: say so instead of silently showing the form again.
  const expired = !session && (await cookies()).getAll().some((cookie) => cookie.value && cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
  const pending =
    params.status === "pending" ||
    (sessionRole(session) === "pending" && !canAccessAdmin(session?.user?.email ?? "", sessionRole(session)));
  return (
    <Suspense>
      <LoginForm initialStatus={pending ? "pending" : expired ? "expired" : undefined} hasAdminConfig={hasAdminConfig} />
    </Suspense>
  );
}
