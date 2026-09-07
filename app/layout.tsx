import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Physical I/O | London's Physical AI Community",
  description: SITE_DESCRIPTION,
  icons: { icon: "/assets/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Physical I/O",
    images: [{url:"/opengraph-image",width:1200,height:630,alt:"Physical I/O — London’s Physical AI community"}],
  },
  twitter: { card: "summary_large_image", site: "@physical_io", images: ["/opengraph-image"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
