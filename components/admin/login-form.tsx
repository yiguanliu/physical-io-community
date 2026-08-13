"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

export default function LoginForm() {
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
    const name = String(form.get("name") ?? "").trim() || "Administrator";

    const signIn = await authClient.signIn.email({ email, password });
    if (!signIn.error) {
      router.push(nextPath);
      router.refresh();
      return;
    }

    const signUp = await authClient.signUp.email({ email, password, name });
    setPending(false);
    if (!signUp.error) {
      router.push(nextPath);
      router.refresh();
      return;
    }

    setError(signIn.error.message || signUp.error.message || "Could not authenticate.");
  }

  return (
    <form className="admin-auth-form" onSubmit={onSubmit}>
      <label>
        Name
        <input name="name" placeholder="Your name" autoComplete="name" />
      </label>
      <label>
        Email
        <input name="email" type="email" required placeholder="you@physical-io.com" autoComplete="email" defaultValue="soul@physical-io.com" />
      </label>
      <label>
        Password
        <input name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="current-password" />
      </label>
      {error ? <p className="admin-auth-error">{error}</p> : null}
      <button className="admin-primary" type="submit" disabled={pending}>
        {pending ? "Please wait…" : "Sign in"}
      </button>
    </form>
  );
}
