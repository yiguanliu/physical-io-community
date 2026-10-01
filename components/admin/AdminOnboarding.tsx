'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { Card, IconButton } from '@/workspace-ui/src';
import type { AdminOnboarding as Steps } from '@/lib/admin/access';

const KEY = 'ohi-admin-onboarding-dismissed';

/** A short setup checklist for administrators; hides once every step is done or when dismissed. */
export default function AdminOnboarding({ steps }: { steps: Steps }) {
  const [hidden, setHidden] = useState(true);
  // Dismissal is remembered on this device; a new missing step shows the checklist again.
  const signature = `${steps.profile}${steps.photo}${steps.publicProfile}`;
  useEffect(() => { try { setHidden(localStorage.getItem(KEY) === signature); } catch { setHidden(false); } }, [signature]);
  if (hidden) return null;
  const items = [
    { done: true, title: 'Sign in to the workspace', detail: 'You’re in. Keep your password safe; use “Forgot password” on the sign-in page if you need a new one.' },
    { done: steps.profile, title: 'Complete your member profile', detail: 'Administrators are community members too. Add your name, role and interests.', href: '/join?onboarding=admin', action: 'Complete profile' },
    { done: steps.photo, title: 'Add a headshot', detail: 'Until you do, your profile shows the Physical I/O logo. Use a clear, recent photo of just you.', href: '/members', action: 'Add photo', disabled: !steps.profile },
    { done: steps.publicProfile, title: 'Make your profile public', detail: 'Open the settings icon on your profile and switch on Public so guests can find you.', href: '/members', action: 'Open my profile', disabled: !steps.profile },
  ];
  const left = items.filter(item => !item.done).length;
  return <Card className="admin-onboarding" aria-labelledby="admin-onboarding-title">
    <div className="admin-onboarding-head">
      <div>
        <h2 id="admin-onboarding-title">Set up your admin account</h2>
        <p className="admin-muted">{left === 1 ? 'One step left.' : `${left} steps left.`} It takes about two minutes.</p>
      </div>
      <IconButton variant="ghost" label="Hide setup steps" onClick={() => { try { localStorage.setItem(KEY, signature); } catch {} setHidden(true); }}><X size={16} /></IconButton>
    </div>
    <ol className="admin-onboarding-steps">
      {items.map((item, index) => <li key={item.title} data-done={item.done || undefined}>
        <span className="admin-onboarding-mark" aria-hidden>{item.done ? <Check size={14} /> : index + 1}</span>
        <div><strong>{item.title}{item.done && <span className="ui-sr-only"> (done)</span>}</strong><p className="admin-muted">{item.detail}</p></div>
        {!item.done && item.href && !item.disabled && <a className="ui-button ui-button-primary" href={item.href}>{item.action}<ArrowRight size={14} aria-hidden /></a>}
      </li>)}
    </ol>
    <p className="admin-muted admin-onboarding-tip">Then explore: <strong>Members</strong> for the community list, <strong>Events</strong> for guest lists and door check-in, and <strong>Communications</strong> for email.</p>
  </Card>;
}
