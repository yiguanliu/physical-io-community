import Link from "next/link";
import LogoMark from "./LogoMark";
import { JOIN_URL } from "@/lib/site";

export default function Nav() {
  return (
    <header className="nav" data-intro>
      <div className="container nav-inner">
        <Link className="brand" href="/" aria-label="Physical I/O home">
          <LogoMark />
          <span className="brand-name">Physical&nbsp;I/O</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          <Link href="/about">About</Link>
          <a className="btn btn-primary" href={JOIN_URL} target="_blank" rel="noopener">
            Join Community
          </a>
        </nav>
      </div>
    </header>
  );
}
