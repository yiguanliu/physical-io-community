'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, CalendarDays, Info } from 'lucide-react';
import LogoMark from '@/workspace-ui/app/LogoMark';
import { Tooltip } from '@/workspace-ui/src';
import './public.css';
import MemberLoginLink from '@/components/members/MemberLoginLink';

export default function PublicHeader({ member = false }: { member?: boolean }) {
  const pathname = usePathname();

  return <header className="public-header">
    <Link href="/" className="public-brand" aria-label="Physical I/O home"><LogoMark /><img src="/assets/physical-io-wordmark.png" alt="Physical I/O" width="879" height="184" /></Link>
    {!member && <nav aria-label="Main" className="public-nav">
      {([['/about', 'About', <Info key="i" size={19} aria-hidden />], ['/events', 'Events', <CalendarDays key="c" size={19} aria-hidden />]] as const).map(([href, label, icon]) => <Tooltip key={href} label={label}><Link href={href} className="public-nav-icon" aria-label={label} aria-current={pathname === href ? 'page' : undefined}>{icon}</Link></Tooltip>)}
      <MemberLoginLink className="public-login-pill" aria-current={pathname === '/login' ? 'page' : undefined}>Login</MemberLoginLink>
    </nav>}
    <div className="public-header-actions">
      {!member && <Link href="/join" className="ui-button ui-button-primary">Join free <ArrowUpRight size={16} aria-hidden="true" /></Link>}
    </div>
  </header>;
}
