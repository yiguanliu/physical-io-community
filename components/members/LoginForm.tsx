'use client';
import { useActionState, useState, useEffect } from 'react';
import Link from 'next/link';
import EmailCodeForm from './EmailCodeForm';
import { Eye, EyeOff, Moon, Sun, ArrowUpRight } from 'lucide-react';
import { Alert, Button, Field, IconButton, ThemeProvider, defaultTheme } from '@/workspace-ui/src';
import { memberLogin, memberRecovery, memberResendConfirmation } from '@/app/login/actions';

import LogoMark from '@/workspace-ui/app/LogoMark';
import '@/workspace-ui/src/styles.css';
import './auth-layout.css';

type Mode = 'signin' | 'recovery' | 'confirm';
const actions = { signin: memberLogin, recovery: memberRecovery, confirm: memberResendConfirmation };
const labels = { signin: 'Sign in', recovery: 'Send reset link', confirm: 'Resend confirmation email' };
function Credentials({ mode, configured, onMode }: { mode: Mode; configured: boolean; onMode: (mode: Mode | 'code') => void }) {
  const [state, action, pending] = useActionState(actions[mode], {});
  const [visible, setVisible] = useState(false);
  return <form action={action} className="member-stack member-login-fields">
    <Field label="Email address" name="email" type="email" autoComplete="username" placeholder="you@example.com" required maxLength={254} disabled={pending || !configured} />
    {mode === 'signin' && <div className="member-password"><Field label="Password" name="password" id="current-password" placeholder="Enter your password" type={visible ? 'text' : 'password'} autoComplete="current-password" required disabled={pending || !configured} /><IconButton label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} variant="ghost" disabled={pending} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</IconButton></div>}

    {state.error && <Alert title="Please try again" tone="danger">{state.error}</Alert>}
    {state.notice && <Alert title="Check your inbox">{state.notice}</Alert>}
    {mode === 'signin' && <div className="member-login-recovery"><Button variant="ghost" disabled={pending} onClick={() => onMode('recovery')}>Forgot password?</Button></div>}
    <div className="admin-login-submit"><Button type="submit" variant="primary" busy={pending} disabled={!configured}>{labels[mode]} <ArrowUpRight size={17}/></Button></div>
    {(mode === 'signin' && state.error) && <Button variant="ghost" disabled={pending} onClick={() => onMode('confirm')}>Resend confirmation email</Button>}

  </form>;
}
export default function LoginForm({ configured, invalidLink = false, joined = false, codePrompt }: { configured: boolean; invalidLink?: boolean; joined?: boolean; codePrompt?: 'confirmed' | 'request' }) {
  const [mode, setMode] = useState<Mode | 'code'>('code');
  const [dark, setDark] = useState(false);
  useEffect(() => { try { const saved = localStorage.getItem('ohi-appearance'); setDark(saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches); } catch {} }, []);
  function toggleAppearance() { setDark(value => { try { localStorage.setItem('ohi-appearance', value ? 'light' : 'dark'); } catch {} return !value; }); }
  const titles = { code: 'Member sign in', signin: 'Member sign in', recovery: 'Reset your password', confirm: 'Confirm your email' };
  return <ThemeProvider theme={{ ...defaultTheme, mode: dark ? 'dark' : 'light' }}><main className="admin-login member-login">
    <div className="admin-login-frame">

    <section className="admin-login-panel" aria-labelledby="member-login-title">
    <div className="admin-login-top"><Link href="/join" className="ui-button ui-button-ghost">Create account</Link><IconButton variant="ghost" label={dark ? 'Use light appearance' : 'Use dark appearance'} onClick={toggleAppearance}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</IconButton></div>
    <div className="admin-login-form">
    <header className="admin-login-heading"><Link href="/" className="admin-login-identity"><LogoMark/><span>Physical I/O</span></Link><h1 id="member-login-title">{titles[mode]}</h1></header>
    {!(joined && mode === 'code') && <p>{mode === 'code' ? 'Get a one-time code at your account email. No password needed.' : mode === 'recovery' ? 'Enter your account email and we’ll send a link to choose a new password.' : mode === 'confirm' ? 'Enter the email you registered with to request a new confirmation link.' : 'Use your email and password to watch Physical I/O talks and past events.'}</p>}
    {codePrompt && <Alert title={codePrompt === 'confirmed' ? 'Email confirmed' : 'Sign in with an email code'}>{codePrompt === 'confirmed' ? 'Your email is confirmed. Enter your email below and select “Email me a sign-in code” to continue.' : 'Enter your email below and select “Email me a sign-in code” to continue. Use the latest code from your inbox.'}</Alert>}
    {invalidLink && <Alert title="This email link is invalid or expired" tone="danger">Request a new confirmation or password reset email below. Open the latest link in the same browser.<div className="member-actions"><Button variant="ghost" onClick={() => setMode('confirm')}>Resend confirmation</Button><Button variant="ghost" onClick={() => setMode('recovery')}>Reset password</Button></div></Alert>}
    {!configured && <Alert title="Login temporarily unavailable">Please try again later.</Alert>}
    {mode === 'code' ? <EmailCodeForm configured={configured} joined={joined} /> : <Credentials key={mode} mode={mode} configured={configured} onMode={setMode} />}
    <Button variant="ghost" onClick={() => setMode(mode === 'code' ? 'signin' : 'code')}>{mode === 'code' ? 'Use a password instead' : 'Back to email sign-in'}</Button>
    </div></section></div>
  </main></ThemeProvider>;
}
