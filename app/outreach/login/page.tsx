"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function OutreachLoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/outreach/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });

    setIsPending(false);
    setMessage(error ? error.message : "Check your email for a secure sign-in link.");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#f7f7f5",
      }}
    >
      <section
        style={{
          width: "min(100%, 420px)",
          padding: "32px",
          border: "1px solid rgba(0,0,0,.12)",
          borderRadius: "16px",
          background: "#fff",
          boxShadow: "0 18px 60px rgba(0,0,0,.08)",
        }}
      >
        <p style={{ color: "#ee4b1a", fontWeight: 700, marginBottom: "8px" }}>Physical I/O</p>
        <h1 style={{ fontSize: "30px", marginBottom: "8px" }}>Outreach sign in</h1>
        <p style={{ color: "rgba(0,0,0,.62)", marginBottom: "24px" }}>
          Use the authorised team email to receive a one-time sign-in link.
        </p>
        <form onSubmit={requestMagicLink} style={{ display: "grid", gap: "14px" }}>
          <label htmlFor="outreach-email" style={{ display: "grid", gap: "6px", fontWeight: 600 }}>
            Email
            <input
              id="outreach-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid rgba(0,0,0,.2)",
                borderRadius: "10px",
                font: "inherit",
              }}
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: "13px 18px",
              border: 0,
              borderRadius: "999px",
              background: "#000",
              color: "#fff",
              font: "inherit",
              fontWeight: 700,
              cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.65 : 1,
            }}
          >
            {isPending ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
        {message ? (
          <p role="status" style={{ marginTop: "16px", color: "rgba(0,0,0,.7)" }}>
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
