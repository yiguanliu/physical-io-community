import type { Metadata } from "next";
import HomeStage from "@/components/HomeStage";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Physical I/O | London's Physical AI Community",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Physical I/O | London's Physical AI Community",
    description:
      "London's community for Physical AI, Robotics, Spatial Intelligence, Wearables, Intelligent Hardware and Embodied AI.",
    url: "/",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Physical I/O",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/assets/favicon.svg`,
  description:
    "Physical I/O is an independent London community connecting founders, engineers, designers, researchers, investors and builders exploring Physical AI, Robotics, Spatial Intelligence, Wearables and Intelligent Hardware.",
  address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
  knowsAbout: [
    "Physical AI",
    "Robotics",
    "Spatial Intelligence",
    "Wearables",
    "Embodied AI",
    "Intelligent Hardware",
    "Human Computer Interaction",
    "Computer Vision",
    "Design Engineering",
  ],
};

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Physical I/O",
  url: `${SITE_URL}/`,
  description:
    "London's community for Physical AI, Robotics, Spatial Intelligence, Wearables, Intelligent Hardware and Embodied AI.",
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
      <HomeStage />
    </>
  );
}
