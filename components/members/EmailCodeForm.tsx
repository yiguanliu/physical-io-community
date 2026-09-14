'use client';
import { useActionState, useState } from 'react';
import { Alert, Button, Field } from '@/workspace-ui/src';
import { memberSendCode, memberVerifyCode } from '@/app/login/actions';
export default function EmailCodeForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState('');
  const [sent, send, sending] = useActionState(memberSendCode, {});
  const [verified, verify, verifying] = useActionState(memberVerifyCode, {});
  const [hasCode, setHasCode] = useState(false);
  const ready = Boolean(sent.notice) || hasCode;
  return <div className="member-stack">
    <form action={send} className="member-stack">
      <Field name="email" label="Email address" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} readOnly={ready} disabled={!configured || sending || verifying} />
      {sent.error && <Alert title="Unable to send code" tone="danger">{sent.error}</Alert>}
      {sent.notice && <Alert title="Check your inbox">{sent.notice}</Alert>}
      <Button type="submit" variant={ready ? 'secondary' : 'primary'} busy={sending} disabled={!configured || verifying}>{ready ? 'Resend code' : 'Email me a sign-in code'}</Button>
    </form>
    {ready && <form action={verify} className="member-stack"><input type="hidden" name="email" value={email} /><Field label="Email code" name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required disabled={sending || verifying} hint="Enter the code from your latest email." />{verified.error && <Alert title="Unable to sign in" tone="danger">{verified.error}</Alert>}<Button type="submit" variant="primary" busy={verifying} disabled={sending}>Verify and sign in</Button></form>}
    {!ready && <Button variant="ghost" disabled={sending || !email} onClick={() => setHasCode(true)}>I already have a code</Button>}
  </div>;
}
