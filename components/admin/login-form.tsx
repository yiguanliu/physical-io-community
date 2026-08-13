"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

export default function LoginForm({ setup }: { setup: boolean }) {
  const router = useRouter();
  const nextPath = useSearchParams().get("next") || "/admin";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "Administrator");
    const result = setup
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message || "Could not authenticate.");
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <form className="admin-auth-form" onSubmit={onSubmit}>
      {setup ? (
        <label>
          Name
          <input name="name" required placeholder="Your name" autoComplete="name" />
        </label>
      ) : null}
      <label>
        Email
        <input name="email" type="email" required placeholder="you@physical-io.com" autoComplete="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete={setup ? "new-password" : "current-password"} />
      </label>
      {error ? <p className="admin-auth-error">{error}</p> : null}
      <button className="admin-primary" type="submit" disabled={pending}>
        {pending ? "Please wait…" : setup ? "Create admin account" : "Sign in"}
      </button>
    </form>
  );
}
