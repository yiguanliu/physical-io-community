'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, Field } from '@/workspace-ui/src';
import { memberUpdatePassword } from '@/app/login/actions';
export default function ResetPassword() {
  const [state, action, pending] = useActionState(memberUpdatePassword, {});
  return <Card className="member-auth member-stack"><h1>{state.notice ? 'Password saved' : 'Set your password'}</h1>{state.notice ? <><Alert title="You’re ready" tone="success">{state.notice}</Alert><Link href="/members" className="ui-button ui-button-primary">Go to event library</Link></> : <form action={action} className="member-stack"><Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={12} disabled={pending} hint="Use at least 12 characters." /><Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required minLength={12} disabled={pending} />{state.error && <Alert title="Check your details" tone="danger">{state.error}</Alert>}<Button type="submit" variant="primary" busy={pending}>Save password</Button></form>}</Card>;
}
