import type { Metadata } from 'next';
import '../src/styles.css';
import './gallery.css';
export const metadata: Metadata = { title: 'ohi — Workspace UI', description: 'Physical I/O workspace component library', robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body style={{ margin: 0 }}>{children}</body></html>; }
