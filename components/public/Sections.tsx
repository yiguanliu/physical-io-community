import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';

export function Hero({ title, children, actions }: { title: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return <header className="public-hero"><h1>{title}</h1><p>{children}</p>{actions && <div className="public-actions">{actions}</div>}</header>;
}
export function ActionLink({ href, children, primary = false, external = false }: { href: string; children: ReactNode; primary?: boolean; external?: boolean }) {
  return <Link className={`ui-button ui-button-${primary ? 'primary' : 'ghost'}`} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}<>{external ? <ArrowUpRight size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}</></Link>;
}
export function SectionHeading({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="public-section-heading"><h2>{title}</h2>{children && <p>{children}</p>}</header>;
}
export function ClosingNote({ title, children, href, action }: { title: string; children: ReactNode; href: string; action: string }) {
  return <section className="public-closing"><div><h2>{title}</h2><p>{children}</p></div><ActionLink href={href} primary>{action}</ActionLink></section>;
}
