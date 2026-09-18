'use client';
import { ArrowUpRight } from 'lucide-react';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ThemeProvider, defaultTheme } from '@/workspace-ui/src';
import PublicHeader from './PublicHeader';
import { usePublicMotion } from './usePublicMotion';
import { LINKEDIN_URL, INSTAGRAM_URL } from '@/lib/site';
import '@/workspace-ui/src/styles.css';
import './public.css';

export default function PublicShell({ children, member = false }: { children: ReactNode; member?: boolean }) {
  const motionRoot = useRef<HTMLDivElement>(null);
  usePublicMotion(motionRoot, !member);
  const [dark, setDark] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ohi-appearance');
      setDark(saved !== 'light');
    } catch { /* Use the dark default when storage is unavailable. */ }
  }, []);
  function toggleTheme() {
    setDark(current => {
      try { localStorage.setItem('ohi-appearance', current ? 'light' : 'dark'); } catch { /* The theme still changes for this visit. */ }
      return !current;
    });
  }
  return <ThemeProvider theme={{ ...defaultTheme, mode: dark ? 'dark' : 'light' }}>
    <div ref={motionRoot} className="public-site">
      <a className="ui-skip" href="#public-main">Skip to content</a>
      <PublicHeader member={member} dark={dark} onToggleTheme={toggleTheme} />
      <main id="public-main" tabIndex={-1} className="public-main">{children}</main>
      {!member && <footer className="public-footer">
        <div><Link href="/" className="public-footer-brand">Physical I/O</Link><p>Curiosity. Design. Engineering.</p><p>London · Connected everywhere.</p></div>
        <nav aria-label="Footer"><Link href="/about">About</Link><Link href="/events">Events</Link><Link href="/login">Member login</Link><Link href="/join">Join the community</Link><Link href="/askusanything">Get in touch</Link></nav>
        <nav aria-label="Social and legal"><a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={16} aria-hidden="true" /></a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link></nav>
        <div className="public-footer-bottom"><span>© {new Date().getFullYear()} Physical I/O</span><span>Love, Mind + Body.</span></div>
      </footer>}
    </div>
  </ThemeProvider>;
}
