import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import Faq from "@/components/Faq";
import PixelBlastBackground from "@/components/PixelBlastBackground";
import {
  AUDIENCE,
  FAQ,
  FOCUS_AREAS,
  HOW_WE_BUILD,
  JOIN_URL,
  MEMBER_ORGS,
  ROADMAP,
  SITE_URL,
  STRUCTURE_TIERS,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "About | Physical I/O — London's Physical AI Community",
  description:
    "Physical I/O builds the community behind Physical AI in London — through meetups, demo nights, technical talks, founder panels and workshops.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Physical I/O",
    description: "Building the community behind Physical AI in London.",
    url: "/about",
  },
};

const aboutPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Physical I/O",
  url: `${SITE_URL}/about`,
  description:
    "Physical I/O builds the community behind Physical AI in London — through meetups, demo nights, technical talks, founder panels and workshops.",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function AboutPage() {
  return (
    <div className="page-about">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <PixelBlastBackground />

      <Nav />

      <main>
        <section className="hero">
          <div className="container narrow">
            <span className="eyebrow">About Physical I/O</span>
            <h1>Building the community behind Physical&nbsp;AI.</h1>
          </div>
        </section>

        <section className="section" aria-label="Why Physical I/O">
          <Reveal className="container narrow">
            <span className="eyebrow">Why</span>
            <p className="statement">
              Today&apos;s AI communities focus primarily on software. The next generation of intelligence will exist
              in the physical world.
            </p>
            <ul className="dot-list">
              <li>Robots</li>
              <li>Wearables</li>
              <li>Autonomous systems</li>
              <li>Spatial interfaces</li>
              <li>Intelligent hardware</li>
            </ul>
            <p className="statement-close">Physical I/O connects the people building that future.</p>
          </Reveal>
        </section>

        <section className="section" aria-label="How we build community">
          <Reveal className="container narrow">
            <span className="eyebrow">How</span>
            <h2 className="section-title">How we build community</h2>
            <ul className="dot-list">
              {HOW_WE_BUILD.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section className="section" aria-label="Focus areas">
          <Reveal className="container narrow">
            <span className="eyebrow">What</span>
            <h2 className="section-title">Focus areas</h2>
            <ul className="dot-list">
              {FOCUS_AREAS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section className="section" aria-label="Who it is for">
          <Reveal className="container narrow">
            <span className="eyebrow">Community</span>
            <h2 className="section-title">Who is it for?</h2>
            <p className="section-intro">Physical AI is built by multidisciplinary teams. So is this community.</p>
            <ul className="dot-list">
              {AUDIENCE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section className="section" aria-label="Member organisations">
          <Reveal className="container narrow">
            <span className="eyebrow">Current Members</span>
            <h2 className="section-title">Members work across</h2>
            {/* Only display organisations with real community members */}
            <div className="logos">
              {MEMBER_ORGS.map((org) => (
                <span key={org}>{org}</span>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="section" aria-label="Community structure">
          <Reveal className="container narrow">
            <span className="eyebrow">Community Structure</span>
            <h2 className="section-title">How the community is organised</h2>
            <div className="structure">
              {STRUCTURE_TIERS.map((tier, i) => (
                <div key={tier.name} style={{ display: "contents" }}>
                  {i > 0 && (
                    <div className="tier-arrow" aria-hidden="true">
                      ↓
                    </div>
                  )}
                  <div className="tier">
                    <span className="tier-name">{tier.name}</span>
                    <p>{tier.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="structure-note">
              The structure represents contribution and responsibility rather than status.
            </p>
          </Reveal>
        </section>

        <section className="section" aria-label="Community roadmap">
          <Reveal className="container narrow">
            <span className="eyebrow">Community Roadmap</span>
            <h2 className="section-title">Where this is going</h2>
            <div className="roadmap">
              {ROADMAP.map((item) => (
                <div className={`roadmap-item${item.now ? " now" : ""}`} key={item.when}>
                  <div className="roadmap-when">{item.when}</div>
                  <div className="roadmap-what">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="section" aria-label="Frequently asked questions">
          <Reveal className="container narrow">
            <span className="eyebrow">FAQ</span>
            <h2 className="section-title">Questions, answered</h2>
            <Faq />
          </Reveal>
        </section>

        <section className="cta-band">
          <Reveal className="container narrow">
            <h2>Be part of it from the start.</h2>
            <p>We are building the founding community right now. Join early, shape what it becomes.</p>
            <a className="btn btn-primary btn-lg" href={JOIN_URL} target="_blank" rel="noopener">
              Join the Community <span className="arrow">→</span>
            </a>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
