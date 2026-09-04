"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { requestAdminAccessAction, signInAdminAction, type AdminAuthActionResult } from "@/app/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signin" | "request";

const AUTH_ACTION_TIMEOUT_MS = 20000;

function goToAdmin(path: string) {
  window.location.assign(path);
}

function timeoutMessage(mode: Mode) {
  return mode === "signin"
    ? "Sign in is taking longer than expected. Check your connection and try again."
    : "Access request is taking longer than expected. Check your connection and try again.";
}

async function runAuthAction(
  action: Promise<AdminAuthActionResult>,
  mode: Mode,
): Promise<AdminAuthActionResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AdminAuthActionResult>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ ok: false, error: timeoutMessage(mode) });
    }, AUTH_ACTION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([action, timeout]);
  } catch {
    return { ok: false, error: "Authentication request failed. Check your connection and try again." };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function LoginForm({ initialStatus }: { initialStatus?: string }) {
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
    const result = await runAuthAction(signInAdminAction(form), "signin");
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    if (result.pending) {
      setPending(false);
      setNotice("Your request is waiting for an administrator to add you.");
      return;
    }
    goToAdmin(nextPath);
  }

  async function onRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const result = await runAuthAction(requestAdminAccessAction(new FormData(event.currentTarget)), "request");
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    if (result.pending) {
      setPending(false);
      setMode("signin");
      setNotice(
        result.confirmationRequired
          ? "Account created. Confirm your email, then an administrator can add you."
          : "Account created. An administrator will add you before you can sign in to the workspace.",
      );
      return;
    }
    if (result.confirmationRequired) {
      setPending(false);
      setMode("signin");
      setNotice("Account created. Check your email to confirm it before signing in.");
      return;
    }
    goToAdmin(nextPath);
  }

  if (mode === "request") {
    return (
      <form className="admin-auth-form" onSubmit={onRequest}>
        <label>
          Name
          <Input name="name" required placeholder="Your name" autoComplete="name" />
        </label>
        <label>
          Email
          <Input name="email" type="email" required placeholder="you@physical-io.com" autoComplete="email" />
        </label>
        <label>
          Password
          <Input name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" />
        </label>
        {error ? <p className="admin-auth-error">{error}</p> : null}
        <Button className="admin-primary" type="submit" disabled={pending}>
          {pending ? "Please wait…" : "Request admin access"}
        </Button>
        <Button className="admin-auth-switch h-auto justify-start p-0 no-underline hover:no-underline" variant="link" type="button" onClick={() => { setMode("signin"); setError(null); }}>
          Already have an account? Sign in
        </Button>
      </form>
    );
  }

  return (
    <form className="admin-auth-form" onSubmit={onSignIn}>
      <label>
        Email
        <Input name="email" type="email" required placeholder="you@physical-io.com" autoComplete="email" />
      </label>
      <label>
        Password
        <Input name="password" type="password" required minLength={8} placeholder="Your password" autoComplete="current-password" />
      </label>
      {notice ? <p className="admin-auth-success">{notice}</p> : null}
      {error ? <p className="admin-auth-error">{error}</p> : null}
      <Button className="admin-primary" type="submit" disabled={pending}>
        {pending ? "Please wait…" : "Sign in"}
      </Button>
      <Button className="admin-auth-switch h-auto justify-start p-0 no-underline hover:no-underline" variant="link" type="button" onClick={() => { setMode("request"); setError(null); setNotice(null); }}>
        Don&apos;t have an account? Request admin access
      </Button>
    </form>
  );
}
