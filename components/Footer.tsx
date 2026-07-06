import Link from "next/link";
import LogoMark from "./LogoMark";
import { FOOTER_TOPICS, INSTAGRAM_URL, JOIN_URL, LINKEDIN_URL } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="brand" href="/">
              <LogoMark />
              Physical&nbsp;I/O
            </Link>
            <p>London, United Kingdom</p>
          </div>
          <div>
            <h4>Connect</h4>
            <ul>
              {/* TODO: replace placeholder contact links */}
              <li>
                <a href="mailto:soul@physical-io.com">Email</a>
              </li>
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener">Instagram</a>
              </li>
              <li>
                <a href={LINKEDIN_URL} target="_blank" rel="noopener">LinkedIn</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <a href={JOIN_URL} target="_blank" rel="noopener">Join Community</a>
              </li>
            </ul>
          </div>
        </div>
        <h4>Topics</h4>
        <div className="footer-topics">
          {FOOTER_TOPICS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 Physical I/O</span>
          <span>London&apos;s home for the Physical AI ecosystem</span>
        </div>
      </div>
    </footer>
  );
}
