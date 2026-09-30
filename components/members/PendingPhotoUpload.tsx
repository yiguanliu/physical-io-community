'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/workspace-ui/src';
import { uploadMemberPhoto } from './HeadshotPicker';

export const PENDING_PHOTO_KEY = 'member-join-photo';

/**
 * A photo chosen during /join waits in this browser until the email is verified,
 * then uploads here. Nothing reaches public storage before verification.
 */
export default function PendingPhotoUpload() {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'failed'>('idle');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let pending: string | null = null;
    try { pending = sessionStorage.getItem(PENDING_PHOTO_KEY); } catch { return; }
    if (!pending?.startsWith('data:image/jpeg;base64,')) return;
    setState('uploading');
    fetch(pending).then(response => response.blob()).then(uploadMemberPhoto).then(() => {
      try { sessionStorage.removeItem(PENDING_PHOTO_KEY); } catch {}
      setState('done');
      router.refresh();
    }).catch((error: Error & { status?: number }) => {
      // Not signed in yet: keep the photo for after sign-in. Anything else: let them retry from settings.
      if (error.status === 401) { setState('idle'); return; }
      try { sessionStorage.removeItem(PENDING_PHOTO_KEY); } catch {}
      setState('failed');
    });
  }, [router]);
  if (state === 'uploading') return <Alert title="Adding your photo">Uploading the headshot you chose when you joined…</Alert>;
  if (state === 'failed') return <Alert title="Photo not added" tone="danger">We couldn’t upload the photo you chose when joining. Add it again from your member page.</Alert>;
  return null;
}
