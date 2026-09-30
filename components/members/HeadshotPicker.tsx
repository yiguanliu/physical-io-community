'use client';
import { useRef, useState } from 'react';
import {DEFAULT_HEADSHOT} from '@/lib/members/default-headshot';
import { Camera, Trash2 } from 'lucide-react';
import { Button } from '@/workspace-ui/src';
import './headshot.css';

export const HEADSHOT_GUIDANCE = 'Use a headshot: a clear, recent photo of just you, face and shoulders, facing the camera in good light. No logos, group photos or avatars.';
const OUTPUT = 640;

/** Centre-crops to a square JPEG so every profile photo has the same shape and a small file size. */
export async function squareHeadshot(file: File): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose an image smaller than 15 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    if (side < 200) throw new Error('Choose a larger photo, at least 200 × 200 pixels.');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(OUTPUT, side);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare the photo.');
    // Keep the top of a portrait photo, where the face usually is.
    context.drawImage(bitmap, (bitmap.width - side) / 2, bitmap.height > bitmap.width ? Math.min((bitmap.height - side) * .2, bitmap.height - side) : (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Your browser could not prepare the photo.')), 'image/jpeg', .86));
  } finally { bitmap.close(); }
}

export const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });

export async function uploadMemberPhoto(photo: Blob) {
  const data = new FormData();
  data.set('photo', photo, 'headshot.jpg');
  const response = await fetch('/api/members/photo', { method: 'POST', body: data });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error || 'Your photo could not be uploaded.'), { status: response.status });
  return result.url as string;
}

export default function HeadshotPicker({ preview, name, onChange, onRemove, busy = false }: { preview: string | null; name: string; onChange: (photo: Blob, preview: string) => void | Promise<void>; onRemove?: () => void; busy?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  async function choose(file: File | undefined) {
    if (!file) return;
    setError('');
    try { const photo = await squareHeadshot(file); await onChange(photo, await blobToDataUrl(photo)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Choose another photo.'); }
    finally { if (input.current) input.current.value = ''; }
  }
  return <div className="headshot-picker">
    <div className="headshot-preview" aria-hidden><img src={preview || DEFAULT_HEADSHOT} alt="" /></div>
    <div className="headshot-copy">
      <p>{HEADSHOT_GUIDANCE}</p>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => void choose(e.target.files?.[0])} />
      <div className="headshot-actions">
        <Button busy={busy} onClick={() => input.current?.click()}><Camera size={16} aria-hidden />{preview ? 'Choose another photo' : 'Choose a headshot'}</Button>
        {preview && onRemove && <Button variant="ghost" disabled={busy} onClick={onRemove}><Trash2 size={16} aria-hidden />Remove</Button>}
      </div>
      {error && <p role="alert" className="headshot-error">{error}</p>}
    </div>
  </div>;
}
