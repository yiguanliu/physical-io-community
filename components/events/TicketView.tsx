'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarDays, Download, MapPin, Printer, Share2, UserRound, Video } from 'lucide-react';
import { Alert, Button, Card, Select } from '@/workspace-ui/src';
import { LABEL_SIZES, labelSize, renderLabelSvg, type LabelData } from '@/lib/rsvp/label';

type Episode = { slug: string; number: string; title: string; theme: string; date: string; time: string; venue: string; cover: string; lumaUrl: string };
type Account = { kind: 'join' | 'member' | 'profile'; href: string };
const SIZE_KEY = 'pio-label-size';
// 12 px/mm ≈ 300 dpi: sharp for photos, and an exact multiple of common 203/300 dpi print heads.
const PNG_PX_PER_MM = 12;

async function labelPng(svg: string, widthMm: number, heightMm: number) {
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(widthMm * PNG_PX_PER_MM);
    canvas.height = Math.round(heightMm * PNG_PX_PER_MM);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Export failed')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

export default function TicketView({ label, episode, isOwner, ticketUrl, meetUrl, account }: { label: LabelData; episode: Episode; isOwner: boolean; ticketUrl: string; meetUrl: string | null; account: Account }) {
  const [sizeId, setSizeId] = useState<string>(LABEL_SIZES[0].id);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'image' | 'share' | null>(null);
  useEffect(() => { try { const saved = localStorage.getItem(SIZE_KEY); if (saved && LABEL_SIZES.some(size => size.id === saved)) setSizeId(saved); } catch {} }, []);
  const size = labelSize(sizeId);
  const svg = useMemo(() => renderLabelSvg(label, sizeId), [label, sizeId]);
  const online = label.attendance === 'online';
  const fileName = `physical-io-ep${episode.number}-${label.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  const shareText = `${label.name} · Physical I/O Episode ${episode.number}: ${episode.title}, ${episode.date}`;

  function chooseSize(value: string) { setSizeId(value); try { localStorage.setItem(SIZE_KEY, value); } catch {} }
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
    setBusy('share'); setError(''); setNotice('');
    try {
      if (navigator.share) { await navigator.share({ title: shareText, text: shareText, url: ticketUrl }); return; }
      await navigator.clipboard.writeText(ticketUrl);
      setNotice('Ticket link copied.');
    } catch (e) { if ((e as Error).name !== 'AbortError') setError(`Copy this link: ${ticketUrl}`); } finally { setBusy(null); }
  }

  return <div className="ticket-page">
    {/* Print exactly one label at the selected stock size, edge to edge. */}
    <style>{`@media print{@page{size:${size.width}mm ${size.height}mm;margin:0}}`}</style>
    <div className="ticket-print" aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />

    <header className="ticket-heading">
      <p className="public-eyebrow"><i />Episode {episode.number} · {online ? 'Online ticket' : 'In-person ticket'}</p>
      <h1>{isOwner ? `You’re in, ${label.name.split(' ')[0]}.` : `${label.name}’s ticket`}</h1>
      <p>{online ? 'Join the livestream from anywhere. Keep this page to find the Google Meet link.' : 'Show this ticket or your printed label at check-in.'}</p>
    </header>

    <div className="ticket-layout">
      <section className="ticket-label-column" aria-label="Event label">
        <div className="ticket-label" style={{ aspectRatio: `${size.width} / ${size.height}` }} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="ticket-tools">
          {!online && <Select label="Label size" value={sizeId} onValueChange={chooseSize} options={LABEL_SIZES.map(option => ({ value: option.id, label: option.label }))} />}
          <div className="ticket-actions">
            {!online && <Button variant="primary" onClick={() => window.print()}><Printer size={16} aria-hidden />Print label</Button>}
            <Button busy={busy === 'image'} onClick={saveImage}><Download size={16} aria-hidden />Save image</Button>
            <Button busy={busy === 'share'} onClick={share}><Share2 size={16} aria-hidden />Share</Button>
          </div>
          {!online && <p className="ticket-hint">For thermal printers, choose the matching label size, set margins to none and scale to 100%.</p>}
          {notice && <Alert title="Done" tone="success">{notice}</Alert>}
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
