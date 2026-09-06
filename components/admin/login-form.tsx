"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Eye, EyeOff, Moon, Sun } from "lucide-react";
import LogoMark from "@/workspace-ui/app/LogoMark";
import { requestAdminAccessAction, signInAdminAction, type AdminAuthActionResult } from "@/app/admin/auth-actions";
import { Alert, Button, Field, IconButton, ThemeProvider, defaultTheme, type Theme } from "@/workspace-ui/src";

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

export default function LoginForm({ initialStatus, hasAdminConfig = true }: { initialStatus?: string; hasAdminConfig?: boolean }) {
  const nextPath = useSearchParams().get("next") || "/admin";
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState<Theme>({ ...defaultTheme, density: "compact", hierarchy: "quiet" });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ohi-admin-appearance") || "null");
      if (saved && ["brand", "minimal"].includes(saved.palette) && ["light", "dark"].includes(saved.mode) && ["brand", "sans", "humanist", "mono"].includes(saved.font) && ["compact", "comfortable"].includes(saved.density) && ["quiet", "expressive"].includes(saved.hierarchy) && /^#[\da-f]{6}$/i.test(saved.accent)) setTheme(saved);
    } catch {}
  }, []);
  function toggleAppearance() {
    const next: Theme = { ...theme, mode: theme.mode === "dark" ? "light" : "dark" };
    setTheme(next);
    try { localStorage.setItem("ohi-admin-appearance", JSON.stringify(next)); } catch {}
  }
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
    if (pending) return;
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
    if (pending) return;
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

  return (
    <div className="admin-workspace">
      <ThemeProvider theme={theme}>
        <main className="admin-login">
          <div className="admin-login-frame">
            <section className="admin-login-brand" aria-label="Physical I/O">
              <div className="admin-login-art" aria-hidden="true"><LogoMark /></div>
            </section>
            <section className="admin-login-panel" aria-labelledby="login-title">
              <div className="admin-login-top">
                <Button variant="ghost" disabled={pending} onClick={() => { setMode(mode === "signin" ? "request" : "signin"); setError(null); setNotice(null); setVisible(false); }}>
                  {mode === "signin" ? "Request admin access" : "Back to sign in"}
                </Button>
                <IconButton variant="ghost" label={theme.mode === "dark" ? "Use light appearance" : "Use dark appearance"} onClick={toggleAppearance}>
                  {theme.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </IconButton>
              </div>
              <form key={mode} className="admin-login-form" onSubmit={mode === "signin" ? onSignIn : onRequest}>
                <header className="admin-login-heading">
                  <div className="admin-login-identity"><LogoMark /><span>Physical I/O</span></div>
                  <h1 id="login-title">{mode === "signin" ? "Admin Sign In" : "Request admin access"}</h1>
                  {mode === "request" && <p>Create an account for administrator approval.</p>}
                </header>
                {!hasAdminConfig && <Alert title="Supabase admin key missing" tone="danger">Admin roles and workspace data are stored in Supabase. Set SUPABASE_SECRET_KEY, then redeploy.</Alert>}
                {mode === "request" && <Field label="Name" name="name" required placeholder="Your name" autoComplete="name" />}
                <div className="admin-login-fields">
                  <Field label="Email address" name="email" type="email" required placeholder="you@physical-io.com" autoComplete="email" />
                  <div className="admin-login-password">
                    <Field label="Password" name="password" type={visible ? "text" : "password"} required minLength={8} placeholder={mode === "request" ? "At least 8 characters" : "Enter your password"} autoComplete={mode === "request" ? "new-password" : "current-password"} />
                    <IconButton label={visible ? "Hide password" : "Show password"} aria-pressed={visible} variant="ghost" onClick={() => setVisible(!visible)}>
                      {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                    </IconButton>
                  </div>
                </div>
                {notice && <Alert title="Account status">{notice}</Alert>}
                {error && <Alert title={mode === "signin" ? "Unable to sign in" : "Unable to request access"} tone="danger">{error}</Alert>}
                <div className="admin-login-submit">
                  <Button variant="primary" type="submit" busy={pending}>
                    {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Request admin access"}
                    <ArrowUpRight size={17} />
                  </Button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </ThemeProvider>
    </div>
  );
}
