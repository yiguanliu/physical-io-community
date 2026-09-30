'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Check, Pencil } from 'lucide-react';
import { Alert, Button, Dialog, Field, Select } from '@/workspace-ui/src';
import { ATTENDEE_CATEGORIES, guessCategory, normalizeLinkedin, type Attendance } from '@/lib/rsvp/model';

type Details = { fullName: string; category: string; jobTitle: string; organisation: string; linkedin: string };
const CHOICES: [Attendance, string, string][] = [
  ['in_person', 'In person', 'Printable badge for check-in'],
  ['online', 'Online', 'Google Meet livestream'],
  ['not_going', 'Not going', 'Cancel on Luma'],
];

/** Lets the ticket holder correct their badge details or change how they're attending. */
export default function TicketEdit({ eventSlug, lumaUrl, attendance: current, details: saved }: { eventSlug: string; lumaUrl: string; attendance: Attendance; details: Details }) {
  // Online RSVPs never chose a category; suggest one from the job title, as the RSVP form does.
  const initial = { ...saved, category: saved.category || guessCategory(saved.jobTitle) };
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [attendance, setAttendance] = useState<Attendance>(current);
  const [details, setDetails] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const body = () => JSON.stringify({ action: 'update', event: eventSlug, attendance, ...details });

  function reset(next: boolean) { setOpen(next); if (next) { setAttendance(current); setDetails(initial); setError(''); } }
  async function save() {
    if (!details.fullName.trim()) { setError('Add the name for your badge.'); return; }
    if (!details.category) { setError('Choose what best describes you.'); return; }
    if (details.linkedin.trim() && !normalizeLinkedin(details.linkedin)) { setError('Enter your LinkedIn profile link (linkedin.com/in/your-name).'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Your changes could not be saved.');
      setOpen(false);
      // A new ticket type triggers a fresh confirmation email when the ticket reloads.
      router.refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  // Cancelling opens Luma straight away (a new tab) and records the change without blocking.
  function cancelOnLuma() {
    void fetch('/api/rsvp', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: body() })
      .then(() => router.replace(`/${eventSlug}`)).catch(() => {});
  }

  return <>
    <Button onClick={() => reset(true)}><Pencil size={16} aria-hidden />Edit details</Button>
    <Dialog open={open} onOpenChange={reset} title="Edit your ticket" description="Update your badge details or how you’re joining us.">
      <form className="ticket-edit" onSubmit={e => { e.preventDefault(); if (attendance !== 'not_going') void save(); }}>
        <fieldset className="ticket-edit-attendance">
          <legend>How are you joining?</legend>
          {CHOICES.map(([value, label, hint]) => <button type="button" key={value} aria-pressed={attendance === value} onClick={() => { setAttendance(value); setError(''); }}>
            <span><strong>{label}</strong><small>{hint}</small></span>{attendance === value && <Check size={16} aria-hidden />}
          </button>)}
        </fieldset>
        {attendance === 'not_going' ? <p className="ticket-hint">We’ll open the event on Luma in a new tab. Choose “Can’t make it” there to cancel and free your place for someone on the waitlist.</p> : <>
          <Field label="Name on badge" required maxLength={160} autoComplete="name" value={details.fullName} onChange={e => setDetails({ ...details, fullName: e.target.value })} />
          <Select label="What best describes you?" placeholder="Choose one" value={details.category || undefined} onValueChange={category => setDetails({ ...details, category })} options={ATTENDEE_CATEGORIES.map(value => ({ value, label: value }))} />
          <div className="ticket-edit-row">
            <Field label="Job title" maxLength={160} autoComplete="organization-title" value={details.jobTitle} onChange={e => setDetails({ ...details, jobTitle: e.target.value })} />
            <Field label="Company or organisation" maxLength={160} autoComplete="organization" value={details.organisation} onChange={e => setDetails({ ...details, organisation: e.target.value })} />
          </div>
          <Field label="LinkedIn profile" type="url" maxLength={500} placeholder="linkedin.com/in/your-name" value={details.linkedin} onChange={e => setDetails({ ...details, linkedin: e.target.value })} />
        </>}
        {error && <Alert title="Not saved" tone="danger">{error}</Alert>}
        <div className="ticket-edit-actions">
          <Button variant="ghost" disabled={busy} onClick={() => reset(false)}>Cancel</Button>
          {attendance === 'not_going'
            ? <a className="ui-button ui-button-primary" href={lumaUrl} target="_blank" rel="noopener noreferrer" onClick={cancelOnLuma}>Cancel on Luma <ArrowUpRight size={16} aria-hidden /></a>
            : <Button type="submit" variant="primary" busy={busy}>Save changes</Button>}
        </div>
      </form>
    </Dialog>
  </>;
}
