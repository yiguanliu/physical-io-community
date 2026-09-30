'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarDays, Download, MapPin, Share2, UserRound, Video } from 'lucide-react';
import { Alert, Button, Card, Field } from '@/workspace-ui/src';
import { labelSize, renderLabelSvg, type LabelData } from '@/lib/rsvp/label';
import TicketEdit from './TicketEdit';

type Episode = { slug: string; number: string; title: string; theme: string; date: string; time: string; venue: string; cover: string; lumaUrl: string };
type Account = { kind: 'join' | 'member' | 'profile'; href: string };
// 12 px/mm ≈ 300 dpi: sharp for photos, and an exact multiple of common 203/300 dpi print heads.
const PNG_PX_PER_MM = 12;

// Clipboard API first; the legacy copy command covers browsers that block it.
async function copyText(value: string) {
  try { await navigator.clipboard.writeText(value); return true; } catch { /* Fall back below. */ }
  const area = Object.assign(document.createElement('textarea'), { value, readOnly: true });
  area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { /* Shown as a manual link instead. */ }
  area.remove();
  return copied;
}

async function labelPng(svg: string, widthMm: number, heightMm: number, pxPerMm = PNG_PX_PER_MM) {
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(widthMm * pxPerMm);
    canvas.height = Math.round(heightMm * pxPerMm);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Export failed')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

export default function TicketView({ label, episode, isOwner, emailPending = false, ticketUrl, meetUrl, account }: { label: LabelData; episode: Episode; isOwner: boolean; emailPending?: boolean; ticketUrl: string; meetUrl: string | null; account: Account }) {
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'image' | 'share' | null>(null);
  const [manualLink, setManualLink] = useState(false);
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const emailStarted = useRef(false);
  // One standard label (100 × 150 mm) for the preview and saved image.
  const size = labelSize('100x150');
  const svg = useMemo(() => renderLabelSvg(label, size.id), [label, size.id]);
  const online = label.attendance === 'online';
  const fileName = `physical-io-ep${episode.number}-${label.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  const shareText = `${label.name} · Physical I/O Episode ${episode.number}: ${episode.title}, ${episode.date}`;

  // First visit after RSVP: draw the label in the browser (same image as "Save image") and
  // ask the server to email the ticket, copying the team. The server sends once per ticket type.
  useEffect(() => {
    if (!emailPending || emailStarted.current) return;
    emailStarted.current = true;
    setEmailState('sending');
    (async () => {
      const data = new FormData();
      data.set('event', episode.slug);
      data.set('ticket', ticketUrl.slice(ticketUrl.lastIndexOf('/') + 1));
      try { data.set('image', await labelPng(renderLabelSvg(label, '100x150'), 100, 150, 8), 'ticket.png'); } catch { /* Email still sends with the link. */ }
      const response = await fetch('/api/rsvp/ticket-email', { method: 'POST', body: data });
      const result = await response.json().catch(() => ({}));
      setEmailState(response.ok && result.sent ? 'sent' : response.ok ? 'idle' : 'failed');
    })().catch(() => setEmailState('failed'));
  }, [emailPending, episode.slug, label, ticketUrl]);

  async function saveImage() {
    setBusy('image'); setError(''); setNotice('');
    try {
      const blob = await labelPng(svg, size.width, size.height);
      const file = new File([blob], fileName, { type: 'image/png' });
      // Phones get the native sheet ("Save image"); desktops download the file.
      if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) { await navigator.share({ files: [file], title: shareText }); return; }
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Ticket image saved.');
    } catch (e) { if ((e as Error).name !== 'AbortError') setError('Could not create the image. Try printing to PDF instead.'); } finally { setBusy(null); }
  }
  async function share() {
    setBusy('share'); setError(''); setNotice(''); setManualLink(false);
    try {
      if (navigator.share) {
        try { await navigator.share({ title: shareText, text: shareText, url: ticketUrl }); return; }
        catch (e) { if ((e as Error).name === 'AbortError') return; /* Share sheet refused: copy instead. */ }
      }
      if (await copyText(ticketUrl)) setNotice('Ticket link copied.');
      else setManualLink(true);
    } finally { setBusy(null); }
  }

  return <div className="ticket-page">
    {/* Print exactly one label at the selected stock size, edge to edge. */}
    <style>{`@media print{@page{size:${size.width}mm ${size.height}mm;margin:0}}`}</style>
    <div className="ticket-print" aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />

    <header className="ticket-heading">
      <div className="ticket-chips"><span className="ticket-chip" data-tone="episode">Episode {episode.number}</span><span className="ticket-chip" data-tone={online ? 'online' : 'in-person'}>{online ? 'Online ticket' : 'In-person ticket'}</span></div>
      <h1>{isOwner ? `You’re in, ${label.name.split(' ')[0]}.` : `${label.name}’s ticket`}</h1>
      <p>{online ? 'Join the livestream from anywhere. Keep this page to find the Google Meet link.' : 'Show this ticket or your printed label at check-in.'}</p>
      {emailState !== 'idle' && <p className="ticket-email-status" role="status">{emailState === 'sending' ? 'Emailing your ticket…' : emailState === 'sent' ? 'We’ve emailed your ticket to you.' : 'We couldn’t email your ticket just now. Save the image or share the link below.'}</p>}
    </header>

    <div className="ticket-layout">
      <section className="ticket-label-column" aria-label="Event label">
        <div className="ticket-label" style={{ aspectRatio: `${size.width} / ${size.height}` }} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="ticket-tools">
          <div className="ticket-actions">
            <Button busy={busy === 'image'} onClick={saveImage}><Download size={16} aria-hidden />Save image</Button>
            <Button busy={busy === 'share'} onClick={share}><Share2 size={16} aria-hidden />Share</Button>
            {isOwner && <TicketEdit eventSlug={episode.slug} lumaUrl={episode.lumaUrl} attendance={label.attendance} details={{ fullName: label.name, category: label.category, jobTitle: label.jobTitle, organisation: label.organisation, linkedin: label.linkedin }} />}
          </div>
          {notice && <Alert title="Done" tone="success">{notice}</Alert>}
          {manualLink && <Field label="Copy your ticket link" readOnly value={ticketUrl} onFocus={e => e.currentTarget.select()} hint="Select the link and copy it to share your ticket." />}
          {error && <Alert title="Something went wrong" tone="danger">{error}</Alert>}
        </div>
      </section>

      <div className="ticket-side">
        <Card className="public-card ticket-card">
          <img src={episode.cover} alt="" width={900} height={900} className="ticket-cover" />
          <h2>{episode.title}</h2>
          <p>{episode.theme}</p>
          <dl className="episode-facts">
            <div><dt><CalendarDays size={16} aria-hidden />When</dt><dd>{episode.date}<span>{episode.time} London time</span></dd></div>
            {online
              ? <div><dt><Video size={16} aria-hidden />Where</dt><dd>Google Meet livestream</dd></div>
              : <div><dt><MapPin size={16} aria-hidden />Where</dt><dd>{episode.venue}</dd></div>}
          </dl>
          {online && (meetUrl
            ? <a className="ui-button ui-button-primary" href={meetUrl} target="_blank" rel="noopener noreferrer"><Video size={16} aria-hidden />Join Google Meet</a>
            : <p className="ticket-hint">The Google Meet link will appear here before the event starts.</p>)}
          <div className="public-actions">
            <Link className="ui-button ui-button-ghost" href={`/${episode.slug}`}>Event details <ArrowRight size={16} aria-hidden /></Link>
            {isOwner && <a className="ui-button ui-button-ghost" href={episode.lumaUrl} target="_blank" rel="noopener noreferrer">Change on Luma <ArrowUpRight size={16} aria-hidden /></a>}
          </div>
        </Card>

        {isOwner && <Card className="public-card ticket-card">
          <UserRound size={28} aria-hidden />
          {account.kind === 'profile' ? <>
            <h2>Your profile is live.</h2>
            <p>Share your Physical I/O profile with the people you meet.</p>
            <Link className="ui-button ui-button-primary" href={account.href}>View my profile <ArrowRight size={16} aria-hidden /></Link>
          </> : account.kind === 'member' ? <>
            <h2>Welcome back.</h2>
            <p>You’re already a member. Sign in to publish your profile page and watch past recordings.</p>
            <Link className="ui-button ui-button-primary" href={account.href}>Member sign in <ArrowRight size={16} aria-hidden /></Link>
          </> : <>
            <h2>Join the community.</h2>
            <p>Create your free member account in a minute. We’ll fill in what you told us on Luma, and you can publish a profile page showing the episodes you’ve attended.</p>
            <Link className="ui-button ui-button-primary" href={account.href}>Create my account <ArrowRight size={16} aria-hidden /></Link>
          </>}
        </Card>}
      </div>
    </div>
  </div>;
}
