import { ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import PublicShell from '@/components/public/PublicShell';
import PixelArt from '@/components/public/PixelArt';
import LumaCalendar from '@/components/public/LumaCalendar';
import { Hero, ActionLink, SectionHeading, ClosingNote } from '@/components/public/Sections';
import { Card } from '@/workspace-ui/src';
import { EVENT_FORMATS, LUMA_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Events | Physical I/O', description: 'Free community gatherings for curious minds. Speaker nights, hackathons and robotics workshops from Physical I/O.', alternates: { canonical: '/events' }, openGraph: { description: 'Free community gatherings for curious minds. Speaker nights, hackathons and robotics workshops from Physical I/O.', title: 'Meet. Share. Build. | Physical I/O', url: '/events' } };

export default function EventsPage() {
  return <PublicShell>
    <Hero title={<>Good people.<br />New possibilities.</>} actions={<><ActionLink href="/join" primary>Join free</ActionLink><ActionLink href="#upcoming">Upcoming events</ActionLink></>}>Free gatherings for people curious about physical intelligence. Come for a talk, meet a collaborator, or make your first robot.</Hero>
    <ol className="public-steps"><li><span>01</span>Join the community free</li><li><span>02</span>Find a gathering that interests you</li><li><span>03</span>Register and come along</li></ol>
    <section className="public-section"><SectionHeading title="Ideas are better in good company." /><div className="public-tiers">{EVENT_FORMATS.map(format => <Card className="public-card public-format" key={format.name}><PixelArt kind={format.art} /><h3>{format.name}</h3><p>{format.description}</p><ActionLink href="/askusanything">Get involved</ActionLink></Card>)}</div><p className="public-footnote">These are our programme formats. Confirmed dates, session levels and equipment arrangements appear in each event listing.</p></section>
    <section className="public-section" id="upcoming"><SectionHeading title="See you at the next one." /><LumaCalendar /><div className="public-section-end"><a className="public-calendar-link" href={LUMA_URL} target="_blank" rel="noopener noreferrer">Full calendar on Luma <ArrowUpRight size={16} aria-hidden="true" /></a><p id="luma-privacy-note">Luma receives connection information and may use its own browser storage. Its registration and privacy settings apply.</p></div></section>
    <section className="public-section"><div className="public-two-col"><Card className="public-card"><PixelArt kind="ticket" /><h3>Free, with a place reserved.</h3><p>Join free, then register for each event to reserve your place.</p></Card><Card className="public-card"><PixelArt kind="mail" /><h3>Keep in touch, on your terms.</h3><p>Choose the updates you want. Unsubscribe anytime. Event registration messages are separate.</p><ActionLink href="/join">Join the community</ActionLink></Card></div></section>
    <ClosingNote title="Have something to share?" href="/askusanything" action="Let’s collaborate">Give a talk, co-host a gathering, sponsor a programme or introduce your product to people who are curious about it.</ClosingNote>
  </PublicShell>;
}
