import type { ReactNode } from 'react';
import Link from 'next/link';

export function Hero({ eyebrow, title, children, actions }: { eyebrow: string; title: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return <header className="public-hero"><span className="public-eyebrow"><i aria-hidden="true" />{eyebrow}</span><h1>{title}</h1><p>{children}</p>{actions && <div className="public-actions">{actions}</div>}</header>;
}
export function ActionLink({ href, children, primary = false, external = false }: { href: string; children: ReactNode; primary?: boolean; external?: boolean }) {
  return <Link className={`ui-button ui-button-${primary ? 'primary' : 'ghost'}`} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}<span aria-hidden="true">{external ? '↗' : '→'}</span></Link>;
}
export function SectionHeading({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return <header className="public-section-heading"><span className="public-eyebrow">{label}</span><h2>{title}</h2>{children && <p>{children}</p>}</header>;
}
export function ClosingNote({ title, children, href, action }: { title: string; children: ReactNode; href: string; action: string }) {
  return <section className="public-closing"><div><h2>{title}</h2><p>{children}</p></div><ActionLink href={href} primary>{action}</ActionLink></section>;
}
