'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Mail, Upload } from 'lucide-react';
import { Alert, Badge, Button, Card, DataTable, Dialog, Field, SearchField, Select, Skeleton, Toast, Toolbar, type Column } from '@/workspace-ui/src';
import EmailComposer from './EmailComposer';
import CampaignDelivery from './CampaignDelivery';
import { EPISODES, type PublicEpisode } from '@/lib/events/catalog';
import type { Registration } from '@/lib/rsvp/service';
import type { SeatState } from '@/lib/rsvp/model';
import type { Episode } from '@/lib/events/model';

type Data = { events: { slug: string; name: string }[]; event?: string; guests: Registration[]; seats: SeatState | null };
const RSVP_LABEL: Record<string, string> = { in_person: 'In person', online: 'Online', not_going: 'Not going' };
const VIEWS = ['Attending', 'In person', 'Online', 'Awaiting RSVP', 'Not going', 'Waitlist', 'All guests'] as const;
type View = (typeof VIEWS)[number];
const inView = (g: Registration, view: View) => view === 'All guests' ? true
  : view === 'Attending' ? g.attendance === 'in_person' || g.attendance === 'online'
  : view === 'Awaiting RSVP' ? g.lumaStatus === 'approved' && !g.attendance
  : view === 'Waitlist' ? g.lumaStatus === 'waitlist'
  : g.attendance === Object.keys(RSVP_LABEL).find(key => RSVP_LABEL[key] === view);
const statusTone = (status: string) => status === 'approved' ? 'success' : status === 'waitlist' ? 'warning' : status === 'declined' ? 'danger' : 'neutral';
// Starting points only; every template stays editable before sending.
const TEMPLATES: Record<string, { subject: string; body: string }> = {
  online: { subject: 'Your link for Physical I/O Episode 02: Robotics', body: 'Hi {{first_name}},\n\nThanks for joining us online. The livestream starts at 18:45 on Wednesday 7 October (London time).\n\n[Open your online ticket]({{ticket_url}})\n\nYour ticket has the Google Meet link. See you there!\n\nPhysical I/O' },
  in_person: { subject: 'See you at Physical I/O Episode 02: Robotics', body: 'Hi {{first_name}},\n\nWe’re looking forward to seeing you on Wednesday 7 October from 18:00 at LG17 Lecture Room, Bentham House, Endsleigh Gardens, London WC1H 0EG.\n\n[Open your ticket]({{ticket_url}})\n\nBring your ticket or printed label for check-in. If you can no longer come, cancel on Luma so someone on the waitlist can take your place.\n\nPhysical I/O' },
  rsvp: { subject: 'Are you joining Episode 02 in person or online?', body: 'Hi {{first_name}},\n\nYou’re registered for Physical I/O Episode 02: Robotics on Wednesday 7 October. In-person places are limited, so please tell us how you’re joining.\n\n[RSVP in a minute]({{rsvp_url}})\n\nPhysical I/O' },
};

async function post(url: string, body: object) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The change could not be saved.');
  return result;
}

/** Matches an admin episode record to a public episode that has an RSVP page. */
export function rsvpEpisodeFor(episode: Pick<Episode, 'name' | 'studio'>): PublicEpisode | null {
  const number = Number(episode.studio?.episode);
  return EPISODES.find(e => e.rsvp && ((number && Number(e.number) === number) || (episode.studio?.registrationUrl && episode.studio.registrationUrl === e.lumaUrl))) ?? null;
}

/** Event dashboard: attendance totals, in-person cap, Luma import and email to selected guests. */
export default function EventGuests({ eventSlug, compact = false, onOpen }: { eventSlug?: string; compact?: boolean; onOpen?: (slug: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [event, setEvent] = useState(eventSlug ?? '');
  const [capacity, setCapacity] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('Attending');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<'capacity' | 'import' | 'email' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [compose, setCompose] = useState<{ ids: string[]; subject: string; body: string } | null>(null);
  const [delivery, setDelivery] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const request = useRef<{ signature: string; id: string } | null>(null);

  const load = useCallback(async (slug?: string) => {
    const response = await fetch(`/api/admin/event-guests${slug ? `?event=${encodeURIComponent(slug)}` : ''}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'The guest list could not load.');
    setData(result); setEvent(result.event ?? ''); setCapacity(result.seats ? String(result.seats.capacity) : '');
  }, []);
  useEffect(() => { load(eventSlug).catch(e => setError(e.message)); }, [load, eventSlug]);

  const guests = data?.guests ?? [];
  const shown = useMemo(() => guests.filter(g => inView(g, view) && `${g.fullName} ${g.email} ${g.organisation} ${g.jobTitle}`.toLowerCase().includes(query.trim().toLowerCase())), [guests, view, query]);
  const count = (predicate: (g: Registration) => boolean) => guests.filter(predicate).length;
  const inPerson = count(g => g.attendance === 'in_person'), online = count(g => g.attendance === 'online');
  const eventName = data?.events.find(e => e.slug === event)?.name ?? 'Event';

  async function saveCapacity() {
    setBusy('capacity'); setError('');
    try { await post('/api/admin/event-guests', { action: 'capacity', event, capacity: Number(capacity) }); await load(event); setNotice(`In-person capacity set to ${capacity}.`); }
    catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }
  async function importCsv(selectedFile: File | undefined) {
    if (!selectedFile) return;
    setBusy('import'); setError('');
    try {
      const result = await post('/api/admin/event-guests', { action: 'import', event, csv: await selectedFile.text() });
      await load(event);
      setNotice(`Imported ${result.created} new and updated ${result.updated} guests${result.skipped ? `; ${result.skipped} rows skipped` : ''}.`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); if (file.current) file.current.value = ''; }
  }
  function startEmail(ids: string[]) {
    const template = view === 'Online' ? TEMPLATES.online : view === 'In person' ? TEMPLATES.in_person : view === 'Awaiting RSVP' ? TEMPLATES.rsvp : { subject: '', body: '' };
    setCompose({ ids, ...template }); setError('');
  }
  async function saveEmail(sendNow: boolean) {
    if (!compose) return;
    setBusy('email'); setError('');
    try {
      const command = { action: 'campaign.save', name: compose.subject, body: compose.body, audience: 'Event guests', event, guestIds: compose.ids };
      const signature = JSON.stringify(command);
      if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
      const result = await post('/api/admin/workspace', { requestId: request.current.id, command });
      request.current = null;
      setCompose(null); setSelected([]);
      if (sendNow) setDelivery(result.id); else setNotice('Draft saved in Communications.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  if (!data) return <Card className="admin-stack"><h2>Guests & RSVP</h2>{error ? <Alert title="Guest list unavailable" tone="danger">{error}</Alert> : <Skeleton label="Loading guest list" />}</Card>;

  const stats = <dl className="event-guest-stats">
    <div><dt>Attending</dt><dd>{inPerson + online}</dd></div>
    <div><dt>In person</dt><dd>{data.seats ? `${inPerson} / ${data.seats.capacity}` : inPerson}</dd>{data.seats && <small>{data.seats.full ? 'Full' : `${data.seats.left} seats left`}</small>}</div>
    <div><dt>Online</dt><dd>{online}</dd></div>
    <div><dt>Awaiting RSVP</dt><dd>{count(g => g.lumaStatus === 'approved' && !g.attendance)}</dd><small>of {count(g => g.lumaStatus === 'approved')} approved on Luma</small></div>
    <div><dt>Not going</dt><dd>{count(g => g.attendance === 'not_going')}</dd></div>
  </dl>;

  if (compact) return <Card className="admin-stack event-guests">
    <div className="admin-row"><div><h2>{eventName}</h2><p className="admin-muted">Guests, in-person seats and attendee email.</p></div><Button variant="primary" onClick={() => onOpen?.(event)}>Open event dashboard</Button></div>
    {stats}
  </Card>;

  const allShownSelected = shown.length > 0 && shown.every(g => selected.includes(g.id));
  const columns: Column<Registration>[] = [
    { key: 'select', label: 'Select', render: g => <input type="checkbox" aria-label={`Select ${g.fullName || g.email}`} checked={selected.includes(g.id)} onChange={e => setSelected(current => e.target.checked ? [...current, g.id] : current.filter(id => id !== g.id))} /> },
    { key: 'name', label: 'Guest', sortValue: g => g.fullName.toLowerCase(), render: g => <div className="event-guest-name"><strong>{g.fullName || '—'}</strong><span className="admin-muted">{g.email}</span></div> },
    { key: 'rsvp', label: 'RSVP', sortValue: g => g.attendance ?? '', render: g => g.attendance ? <Badge tone={g.attendance === 'not_going' ? 'neutral' : 'success'}>{RSVP_LABEL[g.attendance]}</Badge> : <span className="admin-muted">Awaiting</span> },
    { key: 'luma', label: 'Luma', sortValue: g => g.lumaStatus, render: g => <Badge tone={statusTone(g.lumaStatus)}>{g.lumaStatus}</Badge> },
    { key: 'category', label: 'Badge', sortValue: g => g.category, render: g => g.category || <span className="admin-muted">—</span> },
    { key: 'org', label: 'Organisation', sortValue: g => g.organisation.toLowerCase(), render: g => <div className="event-guest-name"><span>{g.organisation || '—'}</span>{g.jobTitle && <span className="admin-muted">{g.jobTitle}</span>}</div> },
    { key: 'when', label: 'RSVP’d', sortValue: g => g.rsvpAt ?? '', render: g => g.rsvpAt ? new Date(g.rsvpAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/London' }) : <span className="admin-muted">—</span> },
    { key: 'ticket', label: 'Ticket', render: g => g.ticketSlug && g.attendance !== 'not_going' ? <a className="ui-button ui-button-ghost" href={`/${event}/ticket/${g.ticketSlug}`} target="_blank" rel="noopener noreferrer">Open<ArrowUpRight size={14} aria-hidden /></a> : <span className="admin-muted">—</span> },
  ];

  return <div className="admin-stack event-guests">
    {error && <Alert title="Unable to complete action" tone="danger">{error}</Alert>}
    <Toast message={notice} onDismiss={() => setNotice('')} />
    {stats}
    {data.seats && inPerson > data.seats.capacity && <Alert title="Over capacity">{inPerson - data.seats.capacity} more in-person RSVPs than seats. Existing tickets stay valid; new in-person RSVPs are closed.</Alert>}
    <Card className="admin-stack">
      <h2>Seats & guest list</h2>
      <div className="event-guest-controls">
        <Field label="Maximum in-person guests" type="number" min={0} max={5000} value={capacity} onChange={e => setCapacity(e.target.value)} hint="When seats run out, the RSVP form offers online only." />
        <Button busy={busy === 'capacity'} disabled={!event || capacity === '' || Number(capacity) === data.seats?.capacity} onClick={saveCapacity}>Save capacity</Button>
        <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={e => void importCsv(e.target.files?.[0])} />
        <Button busy={busy === 'import'} disabled={!event} onClick={() => file.current?.click()}><Upload size={16} aria-hidden />Import Luma CSV</Button>
        <a className="ui-button ui-button-ghost" href={`/${event}/rsvp`} target="_blank" rel="noopener noreferrer">Open RSVP form<ArrowUpRight size={14} aria-hidden /></a>
      </div>
      <p className="admin-muted">Re-import the Luma guest export any time. Luma approval status updates; attendees’ RSVP choices and confirmed badge details are kept. Guests are not added to Members or email lists.</p>
    </Card>
    <Toolbar>
      <SearchField label="Search guests" placeholder="Search name, email, organisation…" value={query} onChange={e => setQuery(e.target.value)} />
      <Select label="Show" value={view} onValueChange={value => setView(value as View)} options={VIEWS.map(value => ({ value, label: `${value} · ${guests.filter(g => inView(g, value)).length}` }))} />
    </Toolbar>
    <div className="admin-selection">
      <label><input type="checkbox" checked={allShownSelected} onChange={e => setSelected(e.target.checked ? Array.from(new Set([...selected, ...shown.map(g => g.id)])) : selected.filter(id => !shown.some(g => g.id === id)))} /> Select shown ({shown.length})</label>
      {selected.length > 0 && <><span>{selected.length} selected</span><Button variant="ghost" onClick={() => startEmail(selected)}><Mail size={16} aria-hidden />Email selected</Button><Button variant="ghost" onClick={() => setSelected([])}>Clear selection</Button></>}
    </div>
    <div className="admin-table-frame"><DataTable rows={shown} columns={columns} rowKey={g => g.id} label={`${eventName} guests`} /></div>
    {!shown.length && <p className="admin-muted">No guests match this view.</p>}

    <Dialog open={!!compose} onOpenChange={open => { if (!open) setCompose(null); }} title="Email guests" description={`${compose?.ids.length ?? 0} selected ${compose?.ids.length === 1 ? 'guest' : 'guests'} · ${eventName}`}>
      {compose && <form className="admin-stack" onSubmit={e => { e.preventDefault(); void saveEmail((e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'send'); }}>
        <div className="admin-inline" role="group" aria-label="Templates">{Object.entries({ online: 'Online link', in_person: 'In-person reminder', rsvp: 'Ask to RSVP' }).map(([key, label]) => <Button key={key} variant="ghost" onClick={() => setCompose({ ...compose, ...TEMPLATES[key] })}>{label}</Button>)}</div>
        <Field label="Subject" required maxLength={200} value={compose.subject} onChange={e => setCompose({ ...compose, subject: e.target.value })} />
        <EmailComposer subject={compose.subject} body={compose.body} onChange={body => setCompose({ ...compose, body })} disabled={busy === 'email'} />
        <p className="admin-muted">Personalise with {'{{first_name}}'}, {'{{full_name}}'}, {'{{ticket_url}}'} (their ticket, or the RSVP form if they haven’t replied) and {'{{rsvp_url}}'}. Unsubscribed, bounced and complained addresses are skipped.</p>
        {error && <Alert title="Check email" tone="danger">{error}</Alert>}
        <div className="admin-actions"><Button variant="ghost" onClick={() => setCompose(null)}>Cancel</Button><Button type="submit" value="draft" disabled={busy === 'email'}>Save draft</Button><Button type="submit" value="send" variant="primary" busy={busy === 'email'}>Send email</Button></div>
      </form>}
    </Dialog>
    <Dialog open={!!delivery} onOpenChange={open => { if (!open) setDelivery(null); }} title="Email delivery" description="Progress and recipient history are saved in Communications.">
      {delivery && <CampaignDelivery key={delivery} id={delivery} autoSend onComplete={() => setNotice('Sending in the background.')} />}
    </Dialog>
  </div>;
}
