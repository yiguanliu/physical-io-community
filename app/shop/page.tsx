import type { Metadata } from 'next';
import PublicShell from '@/components/public/PublicShell';
import PixelArt from '@/components/public/PixelArt';
import { Hero, ActionLink, ClosingNote } from '@/components/public/Sections';
import { Card } from '@/workspace-ui/src';
import { OHI_GITHUB_URL } from '@/lib/site';

export const metadata: Metadata = { title: 'OHI shop | Physical I/O', description: 'Meet OHI, our open hardware project. Register interest in an assembled kit or explore the project on GitHub.', alternates: { canonical: '/shop' }, openGraph: { description: 'Meet OHI, our open hardware project. Register interest in an assembled kit or explore the project on GitHub.', title: 'Meet OHI. Make it yours. | Physical I/O', url: '/shop' } };

export default function ShopPage() {
  return <PublicShell>
    <Hero eyebrow="The shop / OHI" title={<>Meet OHI.<br />Make it yours.</>}>A starting point for curiosity in the physical world. We’re developing OHI for experiments, hands-on learning and robotics workshops.</Hero>
    <section className="public-section" aria-label="Two ways to explore OHI"><div className="public-two-col">
      <Card className="public-card public-product"><div className="public-product-label"><span>01 / Assembled</span><span>In development</span></div><div className="public-product-visual"><PixelArt kind="robot" /></div><h2>Less assembly.<br />More possibility.</h2><p>Our planned assembled kit brings OHI together so you can spend more time experimenting.</p><ul className="public-list" role="list"><li>Assembled hardware and tested components</li><li>Setup guide and project documentation</li><li>A foundation for learning and making</li></ul><ActionLink href="mailto:soul@physical-io.com?subject=OHI%20assembled%20kit%20interest" primary>Register interest</ActionLink><p className="public-footnote">Opens an email to our team. Pricing, final specifications and shipping will be confirmed before orders open. No payment is taken.</p></Card>
      <Card className="public-card public-product"><div className="public-product-label"><span>02 / Open project</span><span>Free to explore</span></div><div className="public-product-visual" data-source="true"><PixelArt kind="source" /></div><h2>Start with the source.<br />Make it your own.</h2><p>Explore our public repository, follow the work and contribute. The community site is available now; the OHI hardware release is being prepared.</p><ul className="public-list" role="list"><li>Public source and project development</li><li>Ideas, issues and community contributions</li><li>Hardware files and build guide to follow</li></ul><ActionLink href={OHI_GITHUB_URL} external>Explore on GitHub</ActionLink><p className="public-footnote">The complete OHI kit download is not yet available. The repository contains the community website today.</p></Card>
    </div><div className="public-product-caption"><span>Open ideas. Physical products.</span><p>The project is free to explore. Assembled products will fund the work through hardware, assembly, testing and fulfilment.</p></div></section>
    <ClosingNote title="Build with us." href="/events" action="Explore workshops">Follow OHI from shared experiments to working hardware. Our workshops are a place to learn, ask questions and try things together.</ClosingNote>
  </PublicShell>;
}
