'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, ArrowUpRight } from 'lucide-react';
import { IconButton } from '@/workspace-ui/src';
import LogoMark from '@/workspace-ui/app/LogoMark';
import './public.css';

export default function PublicHeader({ dark, onToggleTheme, member = false }: {
  member?: boolean;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const pathname = usePathname();

  return <header className="public-header">
    <Link href="/" className="public-brand" aria-label="Physical I/O home"><LogoMark /><img src="/assets/physical-io-wordmark.png" alt="Physical I/O" width="879" height="184" /></Link>
    {!member && <nav aria-label="Main" className="public-nav">
      {[['/about', 'About'], ['/events', 'Events'], ['/login', 'Member login']].map(([href, label]) => <Link href={href} key={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}
    </nav>}
    <div className="public-header-actions">
      {!member && <Link href="/join" className="ui-button ui-button-primary">Join free <ArrowUpRight size={16} aria-hidden="true" /></Link>}
      <IconButton label={dark ? 'Switch to light mode' : 'Switch to dark mode'} variant="ghost" onClick={onToggleTheme}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconButton>
    </div>
  </header>;
}
