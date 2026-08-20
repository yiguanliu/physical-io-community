import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AskForm from "@/components/AskForm";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ask Us Anything | Physical I/O",
  description:
    "Have a question for Physical I/O? Ask us anything — about collaborating, the community, joining, or co-hosting — and we'll get back to you within a day.",
  alternates: { canonical: "/askusanything" },
  openGraph: {
    title: "Ask Us Anything | Physical I/O",
    description:
      "Ask the Physical I/O team anything about collaborating, the community, joining or co-hosting. We reply within a day.",
    url: "/askusanything",
  },
};

const contactPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Ask Us Anything | Physical I/O",
  url: `${SITE_URL}/askusanything`,
  description:
    "Ask the Physical I/O team anything about collaborating, the community, joining or co-hosting.",
};

export default function AskUsAnythingPage() {
  return (
    <div className="page-ask">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageJsonLd) }}
      />

      <Nav />

      <main>
        <section className="ask-section">
          <div className="container narrow ask-shell">
            <div className="ask-intro">
              <span className="eyebrow">Ask Us Anything</span>
              <h1>What would you like to know about us?</h1>
            </div>

            <div className="ask-owl" aria-hidden="true">
              <div className="ask-owl-img" />
              <div className="ask-owl-img ask-owl-img--blur" />
            </div>

            <div className="ask-form-box">
              <AskForm />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
