"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

type Mode = "signin" | "request";

export default function LoginForm({ initialStatus }: { initialStatus?: string }) {
  const router = useRouter();
  const nextPath = useSearchParams().get("next") || "/admin";
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    initialStatus === "pending"
      ? "Your request is waiting for an administrator to add you."
      : null,
  );
  const [pending, setPending] = useState(false);

  async function onSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const result = await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message || "Could not sign in.");
      return;
    }
    const session = await authClient.getSession();
    const role =
      (session.data?.user as { role?: string } | undefined)?.role ??
      (result.data?.user as { role?: string } | undefined)?.role;
    if (role === "pending") {
      setNotice("Your request is waiting for an administrator to add you.");
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  async function onRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim() || "Administrator";
    const result = await authClient.signUp.email({ email, password, name });
    setPending(false);
    if (result.error) {
      setError(result.error.message || "Could not create an account.");
      return;
    }
    const role = (result.data?.user as { role?: string } | undefined)?.role;
    if (role === "pending") {
      await authClient.signOut();
      setMode("signin");
      setNotice("Account created. An administrator will add you before you can sign in to the workspace.");
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  if (mode === "request") {
    return (
      <form className="admin-auth-form" onSubmit={onRequest}>
        <label>
          Name
          <input name="name" required placeholder="Your name" autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required placeholder="you@physical-io.com" autoComplete="email" />
        </label>
        <label>
          Password
          <input name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" />
        </label>
        {error ? <p className="admin-auth-error">{error}</p> : null}
        <button className="admin-primary" type="submit" disabled={pending}>
          {pending ? "Please wait…" : "Request admin access"}
        </button>
        <button className="admin-auth-switch" type="button" onClick={() => { setMode("signin"); setError(null); }}>
          Already have an account? Sign in
        </button>
      </form>
    );
  }

  return (
    <form className="admin-auth-form" onSubmit={onSignIn}>
      <label>
        Email
        <input name="email" type="email" required placeholder="you@physical-io.com" autoComplete="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" required minLength={8} placeholder="Your password" autoComplete="current-password" />
      </label>
      {notice ? <p className="admin-auth-success">{notice}</p> : null}
      {error ? <p className="admin-auth-error">{error}</p> : null}
      <button className="admin-primary" type="submit" disabled={pending}>
        {pending ? "Please wait…" : "Sign in"}
      </button>
      <button className="admin-auth-switch" type="button" onClick={() => { setMode("request"); setError(null); setNotice(null); }}>
        Don&apos;t have an account? Request admin access
      </button>
    </form>
  );
}
