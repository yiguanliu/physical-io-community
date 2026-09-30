'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import LogoMark from '@/workspace-ui/app/LogoMark';
import SiteMenu from './SiteMenu';
import './public.css';
import MemberLoginLink from '@/components/members/MemberLoginLink';

export default function PublicHeader({ member = false, dark, onToggleTheme }: { member?: boolean; dark: boolean; onToggleTheme: () => void }) {
  const pathname = usePathname();

  return <header className="public-header">
    <Link href="/" className="public-brand" aria-label="Physical I/O home"><LogoMark /><img src="/assets/physical-io-wordmark.png" alt="Physical I/O" width="879" height="184" /></Link>
    <div className="public-header-controls">
    <SiteMenu dark={dark} onToggleTheme={onToggleTheme} member={member} />
    {!member && <nav aria-label="Account" className="public-nav">
      <MemberLoginLink className="public-login-pill" aria-current={pathname === '/login' ? 'page' : undefined}>Login</MemberLoginLink>
    </nav>}
    <div className="public-header-actions">
      {!member && <Link href="/join" className="ui-button ui-button-primary">Join free <ArrowUpRight size={16} aria-hidden="true" /></Link>}
    </div>
    </div>
  </header>;
}
