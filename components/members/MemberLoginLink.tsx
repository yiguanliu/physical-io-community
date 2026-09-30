'use client';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Dialog } from '@/workspace-ui/src';
import { MemberSignIn } from './LoginForm';
import './auth-layout.css';
import './members.css';

const OPEN_EVENT = 'pio-open-member-login';
const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
let hosts = 0;

/**
 * "Member login" asks the page's MemberLoginModal to open. Modified clicks (new tab/window), or a
 * page without a modal host, still open /login — the landing page for email links and codes.
 */
export default function MemberLoginLink({ children = 'Member login', className, ...props }: { children?: ReactNode; className?: string; 'aria-current'?: 'page' }) {
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (!hosts || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
  return <Link href="/login" className={className} onClick={open} {...props}>{children}</Link>;
}

/** Mounted once per page, outside menus and popovers, so opening it never unmounts it. */
export function MemberLoginModal() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    hosts++;
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => { hosts--; window.removeEventListener(OPEN_EVENT, show); };
  }, []);
  return <Dialog open={open} onOpenChange={setOpen} title="Member sign in" description="Watch past recordings and manage your profile and event tickets.">
    <div className="member-login member-login-modal member-stack">
      {open && <MemberSignIn configured={configured} />}
      <p className="member-note">New here? <Link href="/join" onClick={() => setOpen(false)}>Create your free account</Link>.</p>
    </div>
  </Dialog>;
}
