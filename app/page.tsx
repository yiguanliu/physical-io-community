import type { Metadata } from "next";
import HomeCommunity from "@/components/HomeCommunity";
import { INSTAGRAM_URL, LINKEDIN_URL, YOUTUBE_URL, X_URL, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Physical I/O | London's Physical AI Community",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Physical I/O | London's Physical AI Community",
    description:
      "London's community for Physical AI, Robotics, Spatial Intelligence, Wearables, Intelligent Hardware and Embodied AI.",
    url: "/",
    images: [{url:"/opengraph-image",width:1200,height:630}],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": SITE_URL+"/#organization",
  name: "Physical I/O",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/assets/favicon.svg`,
  description:
    "Physical I/O is an independent London community connecting founders, engineers, designers, researchers, investors and builders exploring Physical AI, Robotics, Spatial Intelligence, Wearables and Intelligent Hardware.",
  sameAs: [INSTAGRAM_URL, LINKEDIN_URL, YOUTUBE_URL, X_URL],
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
  "@id": SITE_URL+"/#website",
  alternateName: ["Physical IO", "Physical I/O Community"],
  publisher: {"@id":SITE_URL+"/#organization"},
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
      <HomeCommunity />
    </>
  );
}
