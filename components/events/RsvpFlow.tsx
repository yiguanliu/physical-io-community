'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Moon, Sun } from 'lucide-react';
import { Button, IconButton, Field, ThemeProvider, defaultTheme } from '@/workspace-ui/src';
import LogoMark from '@/workspace-ui/app/LogoMark';
import { normalizeLinkedin, ATTENDANCE_LABEL, type Attendance, type SeatState } from '@/lib/rsvp/model';
import '@/workspace-ui/src/styles.css';
import styles from '@/app/join/join.module.css';
import rsvp from './rsvp.module.css';
import homeStyles from '@/components/HomeCommunity.module.css';

type Episode = { slug: string; number: string; title: string; date: string; time: string; venue: string; lumaUrl: string };
type Badge = { fullName: string; organisation: string; jobTitle: string; linkedin: string };
type Lookup =
  | { status: 'not_found'; lumaUrl: string }
  | { status: 'found'; eligibility: 'eligible' | 'waitlist' | 'invited' | 'declined'; firstName: string; attendance: Attendance | null; seats: SeatState | null; badge: Badge | null; lumaUrl: string };
type Step = 'email' | 'found' | 'attendance' | 'badge' | 'leaving';
const STEPS: Step[] = ['email', 'found', 'attendance', 'badge'];
const INELIGIBLE: Record<string, { title: string; body: string }> = {
  waitlist: { title: 'You’re on the waitlist.', body: 'Luma will email you if a place opens up. Once you’re approved, come back here to choose how you’ll join.' },
  invited: { title: 'You’ve been invited.', body: 'Accept your invitation on Luma to register, then come back here to RSVP.' },
  declined: { title: 'We couldn’t confirm your place.', body: 'Your Luma registration isn’t active. Register again on Luma or contact the host if this looks wrong.' },
};

async function post(body: object) {
  const response = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { seatsFull: Boolean(data.seatsFull) });
  return data;
}

export default function RsvpFlow({ episode, initialSeats, closed }: { episode: Episode; initialSeats: SeatState | null; closed: boolean }) {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [badge, setBadge] = useState<Badge>({ fullName: '', organisation: '', jobTitle: '', linkedin: '' });
  const [seats, setSeats] = useState(initialSeats);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openedLuma, setOpenedLuma] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { try { const saved = localStorage.getItem('ohi-appearance'); setDark(saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches); } catch {} }, []);
  useEffect(() => { heading.current?.focus(); }, [step, lookup]);
  function toggleTheme() { setDark(value => { const next = !value; try { localStorage.setItem('ohi-appearance', next ? 'dark' : 'light'); } catch {} return next; }); }

  const found = lookup?.status === 'found' ? lookup : null;
  // A guest who already holds an in-person seat keeps it even when the room is full.
  const inPersonFull = Boolean(seats?.full) && found?.attendance !== 'in_person';
  const admin = attendance === 'admin';

  async function findMe() {
    setBusy(true); setError('');
    try {
      const result: Lookup = await post({ action: 'lookup', event: episode.slug, email });
      setLookup(result);
      if (result.status === 'found') {
        setSeats(result.seats);
        if (result.badge) setBadge(result.badge);
        setAttendance(result.attendance);
        setStep('found');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not check your email.'); } finally { setBusy(false); }
  }
  async function submit(choice: Attendance) {
    setBusy(true); setError('');
    try {
      const result = await post({ action: 'submit', event: episode.slug, email, attendance: choice, ...(choice === 'in_person' || choice === 'admin' ? badge : {}) });
      router.push(result.redirectTo);
    } catch (e) {
      const failure = e as Error & { seatsFull?: boolean };
      if (failure.seatsFull) { setSeats(current => current ? { ...current, left: 0, full: true } : current); setAttendance('online'); setStep('attendance'); }
      setError(failure.message); setBusy(false);
    }
  }
  function next() {
    setError('');
    if (step === 'email') { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return; } void findMe(); return; }
    if (step === 'found') { setStep('attendance'); return; }
    if (step === 'attendance') {
      if (!attendance) { setError('Choose how you’ll join us.'); return; }
      if (attendance === 'in_person') { if (inPersonFull) { setError('In-person places are full. Choose online instead.'); return; } setStep('badge'); return; }
      if (attendance === 'admin') { setStep('badge'); return; }
      if (attendance === 'not_going') { setStep('leaving'); return; }
      void submit('online'); return;
    }
    if (step === 'badge') {
      if (!badge.fullName.trim()) { setError('Add the name for your badge.'); return; }
      if (badge.linkedin.trim() && !normalizeLinkedin(badge.linkedin)) { setError('Enter your LinkedIn profile link (linkedin.com/in/your-name).'); return; }
      void submit(admin ? 'admin' : 'in_person'); return;
    }
  }
  // Cancelling happens on Luma: open it in a new tab straight away and record the choice in the
  // background, so a slow or failed request can never block the person from leaving.
  function cancelOnLuma() {
    setOpenedLuma(true);
    void fetch('/api/rsvp', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', event: episode.slug, email, attendance: 'not_going' }) }).catch(() => {});
  }
  function back() { setError(''); setStep(step === 'badge' || step === 'leaving' ? 'attendance' : step === 'attendance' ? 'found' : 'email'); if (step === 'found') setLookup(null); }

  const index = step === 'leaving' ? 3 : STEPS.indexOf(step);
  const stopped = lookup && (lookup.status === 'not_found' || lookup.eligibility !== 'eligible');
  const seatLine = seats ? (seats.full ? 'In-person places are full.' : `${seats.left} of ${seats.capacity} in-person seats left`) : null;

  return <ThemeProvider theme={{ ...defaultTheme, mode: dark ? 'dark' : 'light' }}><main className={styles.page} data-mode={dark ? 'dark' : 'light'}>
    <header className={`${homeStyles['site-header']} ${styles.header}`}><Link className={homeStyles.brand} href="/" aria-label="Physical I/O home"><LogoMark /><img className={styles.wordmark} src="/assets/physical-io-wordmark.png" alt="Physical I/O" width={879} height={184} /></Link><IconButton label={dark ? 'Switch to light mode' : 'Switch to dark mode'} variant="ghost" onClick={toggleTheme}>{dark ? <Sun size={20} /> : <Moon size={20} />}</IconButton></header>
    {!stopped && !closed && <div className={styles.progress} role="progressbar" aria-label="RSVP progress" aria-valuemin={1} aria-valuemax={4} aria-valuenow={index + 1}><span style={{ width: `${(index + 1) / 4 * 100}%` }} /></div>}
    <section className={styles.content} key={`${step}-${lookup?.status ?? ''}`}>
      <p className={rsvp.event}>Episode {episode.number} · {episode.title} · {episode.date}</p>
      {closed ? <>
        <h1 ref={heading} tabIndex={-1}>This event has finished.</h1>
        <p>Thanks to everyone who came. Members can watch past recordings.</p>
        <footer className={styles.actions}><Link className="ui-button ui-button-primary" href="/events">All episodes <ArrowRight size={18} /></Link></footer>
      </> : lookup?.status === 'not_found' ? <>
        <h1 ref={heading} tabIndex={-1}>We couldn’t find that email.</h1>
        <p>We check against the guest list for this event. Register on Luma first, or try the email address you registered with.</p>
        <footer className={styles.actions}><Button variant="ghost" onClick={() => { setLookup(null); setStep('email'); }}><ArrowLeft size={18} />Try another email</Button><a className="ui-button ui-button-primary" href={lookup.lumaUrl} target="_blank" rel="noopener noreferrer">Register on Luma <ArrowUpRight size={18} /></a></footer>
      </> : found && found.eligibility !== 'eligible' ? <>
        <h1 ref={heading} tabIndex={-1}>{INELIGIBLE[found.eligibility].title}</h1>
        <p>{INELIGIBLE[found.eligibility].body}</p>
        <footer className={styles.actions}><Button variant="ghost" onClick={() => { setLookup(null); setStep('email'); }}><ArrowLeft size={18} />Use another email</Button><a className="ui-button ui-button-primary" href={found.lumaUrl} target="_blank" rel="noopener noreferrer">Open Luma <ArrowUpRight size={18} /></a></footer>
      </> : <form onSubmit={event => { event.preventDefault(); next(); }}>
        {step !== 'leaving' && <div className={styles.counter}>{index + 1} / 4</div>}
        {step === 'email' && <>
          <h1 ref={heading} tabIndex={-1}>What email did you register with on Luma?</h1>
          <p>We’ll find your registration so you can choose how you’re joining us.</p>
          <Field label="Email address" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setError(''); }} />
        </>}
        {step === 'found' && found && <>
          <div className={styles.check}><Check size={28} /></div>
          <h1 ref={heading} tabIndex={-1}>Found you, {found.firstName}.</h1>
          <p>You’re registered for Episode {episode.number}: {episode.title} on {episode.date}, {episode.time}. {found.attendance ? `You previously chose ${ATTENDANCE_LABEL[found.attendance].toLowerCase()}; you can change it now.` : 'Next, tell us how you’ll join.'}</p>
        </>}
        {step === 'attendance' && <>
          <h1 ref={heading} tabIndex={-1}>How will you join us?</h1>
          {seatLine && <p className={rsvp.seats} data-full={seats?.full || undefined}><span aria-hidden style={{ '--seats-taken': seats ? `${Math.min(100, seats.taken / Math.max(1, seats.capacity) * 100)}%` : '0%' } as React.CSSProperties} />{seatLine}</p>}
          <div className={`${styles.choices} ${rsvp.choices}`} role="group" aria-label="How will you join us?">
            {([
              ['in_person', 'Attending in person', inPersonFull ? 'In-person is full. Join us online instead.' : `${episode.venue}. Get a printable badge for check-in.`],
              ['online', 'Attending online', 'Watch the livestream and get the Google Meet link.'],
              ['admin', 'Admin', 'Only for community operators and special guests. Get an admin badge for check-in.'],
              ['not_going', 'Not going', 'Cancel on Luma so someone else can take your place.'],
            ] as [Attendance, string, string][]).map(([value, label, hint]) => {
              const disabled = value === 'in_person' && inPersonFull;
              return <Button key={value} variant="secondary" aria-pressed={attendance === value} disabled={disabled} onClick={() => { setAttendance(value); setError(''); }}>
                <span className={rsvp.choice}><strong>{label}</strong><small>{hint}</small></span>{attendance === value && <Check size={18} />}
              </Button>;
            })}
          </div>
        </>}
        {step === 'badge' && <>
          <h1 ref={heading} tabIndex={-1}>{admin ? 'Confirm your admin badge.' : 'Confirm your badge.'}</h1>
          <p>{admin ? 'Admin tickets are for community operators and special guests. This prints on your label at check-in.' : 'This prints on your label at check-in.'} The QR code links to your LinkedIn.</p>
          <div className={rsvp.fields}>
            <Field label="Name on badge" required maxLength={160} autoComplete="name" value={badge.fullName} onChange={event => setBadge({ ...badge, fullName: event.target.value })} />
            <Field label="Job title" maxLength={160} autoComplete="organization-title" value={badge.jobTitle} onChange={event => setBadge({ ...badge, jobTitle: event.target.value })} />
            <Field label="Company or organisation" maxLength={160} autoComplete="organization" value={badge.organisation} onChange={event => setBadge({ ...badge, organisation: event.target.value })} />
            <Field label="LinkedIn profile" type="url" maxLength={500} placeholder="linkedin.com/in/your-name" value={badge.linkedin} onChange={event => setBadge({ ...badge, linkedin: event.target.value })} />
          </div>
        </>}
        {step === 'leaving' && <>
          <h1 ref={heading} tabIndex={-1}>Sorry to miss you.</h1>
          <p>{openedLuma ? 'We’ve opened the event on Luma in a new tab. Choose “Can’t make it” there to cancel and free your place for someone on the waitlist.' : 'Cancel your registration on Luma to free your place for someone on the waitlist. It opens in a new tab.'}</p>
        </>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <footer className={styles.actions}>
          {step !== 'email' && <Button variant="ghost" disabled={busy} onClick={back}><ArrowLeft size={18} />Back</Button>}
          {step === 'leaving'
            ? <a className="ui-button ui-button-primary" href={episode.lumaUrl} target="_blank" rel="noopener noreferrer" onClick={cancelOnLuma}>{openedLuma ? 'Open Luma again' : 'Cancel on Luma'}<ArrowUpRight size={18} /></a>
            : <Button variant="primary" type="submit" busy={busy}>{step === 'email' ? 'Find my registration' : step === 'badge' ? 'Get my ticket' : step === 'attendance' && attendance === 'online' ? 'Get my online ticket' : 'Continue'}<ArrowRight size={18} /></Button>}
        </footer>
      </form>}
    </section>
  </main></ThemeProvider>;
}
