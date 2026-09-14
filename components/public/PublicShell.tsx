'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ThemeProvider, defaultTheme } from '@/workspace-ui/src';
import PublicHeader from './PublicHeader';
import { LINKEDIN_URL, INSTAGRAM_URL } from '@/lib/site';
import '@/workspace-ui/src/styles.css';
import './public.css';

export default function PublicShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ohi-appearance');
      setDark(saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
    } catch { /* Use the light default when storage is unavailable. */ }
  }, []);
  function toggleTheme() {
    setDark(current => {
      try { localStorage.setItem('ohi-appearance', current ? 'light' : 'dark'); } catch { /* The theme still changes for this visit. */ }
      return !current;
    });
  }
  return <ThemeProvider theme={{ ...defaultTheme, mode: dark ? 'dark' : 'light' }}>
    <div className="public-site">
      <a className="ui-skip" href="#public-main">Skip to content</a>
      <PublicHeader dark={dark} onToggleTheme={toggleTheme} />
      <main id="public-main" tabIndex={-1} className="public-main">{children}</main>
      <footer className="public-footer">
        <div><Link href="/" className="public-footer-brand">Physical I/O</Link><p>Curiosity. Design. Engineering.</p><p>London · Connected everywhere.</p></div>
        <nav aria-label="Footer"><Link href="/about">About</Link><Link href="/events">Events</Link><Link href="/login">Member login</Link><Link href="/join">Join the community</Link><Link href="/askusanything">Get in touch</Link></nav>
        <nav aria-label="Social and legal"><a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram ↗</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link></nav>
        <div className="public-footer-bottom"><span>© {new Date().getFullYear()} Physical I/O</span><span>Love Intelligence + Body.</span></div>
      </footer>
    </div>
  </ThemeProvider>;
}
