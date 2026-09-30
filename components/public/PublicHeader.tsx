'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import LogoMark from '@/workspace-ui/app/LogoMark';
import SiteMenu from './SiteMenu';
import './public.css';
import MemberLoginLink from '@/components/members/MemberLoginLink';

export default function PublicHeader({ member = false, dark, onToggleTheme }: { member?: boolean; dark: boolean; onToggleTheme: () => void }) {
  const pathname = usePathname();
  const hidden = useHideOnScroll();

  return <header className="public-header" data-hidden={hidden || undefined}>
    <Link href="/" className="public-brand" aria-label="Physical I/O home"><LogoMark /><img src="/assets/physical-io-wordmark.png" alt="Physical I/O" width="879" height="184" /></Link>
    <div className="public-header-controls">
    {!member && <nav aria-label="Account" className="public-nav">
      <MemberLoginLink className="public-login-pill" aria-current={pathname === '/login' ? 'page' : undefined}>Login</MemberLoginLink>
    </nav>}
    <div className="public-header-actions">
      {!member && <Link href="/join" className="ui-button ui-button-primary">Join free <ArrowUpRight size={16} aria-hidden="true" /></Link>}
    </div>
    <SiteMenu dark={dark} onToggleTheme={onToggleTheme} member={member} />
    </div>
  </header>;
}

/** Pinned header that slides away while scrolling down and returns on any scroll up. */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y < 80) setHidden(false);
      else if (y > last + 6) setHidden(true);
      else if (y < last - 6) setHidden(false);
      if (Math.abs(y - last) > 6 || y < 80) last = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    // Keyboard users tabbing into the header always get it back.
    const onFocus = (event: FocusEvent) => { if ((event.target as Element | null)?.closest?.('.public-header')) setHidden(false); };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocus);
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('focusin', onFocus); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return hidden;
}
