'use client';
import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { Button } from '@/workspace-ui/src';

/** Native share sheet where available; otherwise copies the link and confirms inline. */
export default function ShareButton({ url, title, label = 'Share' }: { url: string; title: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* The person dismissed the share sheet. */ }
  }
  return <Button onClick={share} aria-live="polite">{copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}{copied ? 'Link copied' : label}</Button>;
}
