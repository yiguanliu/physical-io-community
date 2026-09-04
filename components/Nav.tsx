import Link from "next/link";
import LogoMark from "./LogoMark";
import HeaderActions from "./HeaderActions";

export default function Nav() {
  return (
    <header className="nav" data-intro>
      <div className="container nav-inner">
        <Link className="brand" href="/" aria-label="Physical I/O home">
          <LogoMark />
          <span className="brand-name">Physical&nbsp;I/O</span>
        </Link>
        <HeaderActions />
      </div>
    </header>
  );
}
