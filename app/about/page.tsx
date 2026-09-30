import { ArrowDown, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/public/PublicShell';
import PixelArt from '@/components/public/PixelArt';
import { Hero, ActionLink, SectionHeading, ClosingNote } from '@/components/public/Sections';
import { Card } from '@/workspace-ui/src';
import { BUSINESS_TIERS, MEMBER_BENEFITS, MEMBER_RIGHTS, SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About | Physical I/O', description: SITE_DESCRIPTION, alternates: { canonical: '/about' },
  openGraph: { title: 'Curiosity. Design. Engineering. | Physical I/O', description: SITE_DESCRIPTION, url: '/about' },
};

export default function AboutPage() {
  return <PublicShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About Physical I/O', url: SITE_URL + '/about', description: SITE_DESCRIPTION }) }} />
    <Hero title={<>Curious minds.<br />Physical possibilities.</>} actions={<><ActionLink href="/join" primary>Join the community</ActionLink><ActionLink href="/events">Explore events</ActionLink></>}>
      A community led by curiosity, design and engineering. We bring people together to explore how humans and intelligent systems can coexist in the physical world.
    </Hero>

    <section className="public-section" aria-label="Our community">
      <div className="public-bento">
        <Card className="public-card public-card-wide"><img className="public-love-mind-body" src="/assets/brand/love-mind-body.png" alt="Pixel-art heart, brain and human figure representing love, mind and body" width={872} height={422} loading="lazy" /><h2>Love, Mind + Body</h2><p>Care for people. Explore new ideas. Build things that make life better.</p></Card>
        <Card className="public-card"><PixelArt kind="people" /><h2>Find your people.</h2><p>Meet people who share your curiosity. Everyone is welcome.</p></Card>
        <Card className="public-card"><PixelArt kind="idea" /><h3>A reason to gather.</h3><p>Share an idea. Ask a question. Make a connection.</p></Card>
        <Card className="public-card"><PixelArt kind="hackathon" /><h3>Meet. Share. Build.</h3><p>Talks, workshops and hands-on experiments.</p><Link className="public-card-link" href="/events">Find a gathering <ArrowRight size={16} aria-hidden="true" /></Link></Card>
        <Card className="public-card"><PixelArt kind="ticket" /><h3>Free to belong.</h3><p>Join free. Community events are free too, with limited places.</p><Link className="public-card-link" href="/join">Become a member <ArrowRight size={16} aria-hidden="true" /></Link></Card>
        <Card className="public-card public-card-full"><h2>Ideas deserve a physical form.</h2><p>We’re developing tools and services to take hardware from idea to production.</p><Link className="public-card-link" href="#business">How the business works <ArrowDown size={16} aria-hidden="true" /></Link></Card>
      </div>
    </section>

    <section id="business" className="public-section">
      <SectionHeading title="Free community. Real business.">Physical I/O is a commercial company. Products, paid services and partnerships help fund the spaces, programmes and connections we create.</SectionHeading>
      <div className="public-tiers">{BUSINESS_TIERS.map((tier, index) => <Card className="public-card public-tier" key={tier.name}><h3>{tier.name}</h3><span className="public-tier-price">{tier.price}</span><p className="public-tier-description">{tier.description}</p><ul className="public-list" role="list">{tier.features.map(x => <li key={x}>{x}</li>)}</ul><ActionLink href={tier.href} primary={index === 0}>{tier.action}</ActionLink></Card>)}</div>
      <p className="public-footnote">Build services and the ordering platform are in development. Talk to us about your project; we’ll agree the scope, availability and price before any work begins.</p>
    </section>

    <section className="public-section">
      <SectionHeading title="A place to contribute. A place to belong." />
      <div className="public-two-col"><Card className="public-card"><h3>What you get</h3><ul className="public-list" role="list">{MEMBER_BENEFITS.map(x => <li key={x}>{x}</li>)}</ul></Card><Card className="public-card"><h3>What you can expect from us</h3><ul className="public-list" role="list">{MEMBER_RIGHTS.map(x => <li key={x}>{x}</li>)}</ul><Link href="/privacy" className="public-card-link">Your privacy <ArrowRight size={16} aria-hidden="true" /></Link></Card></div>
    </section>
    <ClosingNote title="Bring your curiosity." href="/join" action="Join free">You don’t need a finished project or a particular job title. Start with what interests you.</ClosingNote>
  </PublicShell>;
}
