'use client';

import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button, Dialog, IconButton, Select } from '@/workspace-ui/src';

const fonts = {
  manrope: '"Manrope", Arial, Helvetica, sans-serif',
  rokkitt: '"Rokkitt", Georgia, serif',
  dot: '"Bitcount Grid Single", "Courier New", monospace',
};
type Font = keyof typeof fonts;
type Preferences = { headings: Font; body: Font };
const defaults: Preferences = { headings: 'manrope', body: 'manrope' };
const options = [{ value: 'manrope', label: 'Manrope' }, { value: 'rokkitt', label: 'Rokkitt' }, { value: 'dot', label: 'Dot font' }];
const key = 'ohi-typography';
function isFont(value: unknown): value is Font { return typeof value === 'string' && Object.hasOwn(fonts, value); }
function read(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}');
    return { headings: isFont(saved?.headings) ? saved.headings : defaults.headings, body: isFont(saved?.body) ? saved.body : defaults.body };
  } catch { return defaults; }
}
function apply(value: Preferences) {
  document.documentElement.style.setProperty('--font-public-heading', fonts[value.headings]);
  document.documentElement.style.setProperty('--font-public-body', fonts[value.body]);
  document.documentElement.style.setProperty('--font-public-body-weight', value.body === 'dot' ? '600' : '400');
  document.documentElement.style.setProperty('--font-public-heading-weight', value.headings === 'rokkitt' ? '400' : '600');
}
export default function TypographySettings({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Preferences>(defaults);
  useEffect(() => {
    const sync = () => { const next = read(); setValue(next); apply(next); };
    const update = (event: Event) => { const next = (event as CustomEvent<Preferences>).detail; setValue(next); apply(next); };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('ohi-typography-change', update);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('ohi-typography-change', update); };
  }, []);
  function change(next: Preferences) {
    setValue(next); apply(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Apply for this visit when storage is unavailable. */ }
    window.dispatchEvent(new CustomEvent('ohi-typography-change', { detail: next }));
  }
  return <>
    <IconButton className="public-settings-button" label="Settings" title="Settings" variant="ghost" onClick={() => setOpen(true)}><Settings2 size={18} /></IconButton>
    <Dialog open={open} onOpenChange={setOpen} title="Settings" description="Choose your theme and fonts. Changes appear immediately and are remembered on this device.">
      <div className="public-text-settings">
        <Select label="Theme" value={dark ? 'dark' : 'light'} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} onValueChange={mode => { if ((mode === 'dark' || mode === 'light') && (mode === 'dark') !== dark) onToggleTheme(); }} />
        <Select label="Heading font" options={options} value={value.headings} onValueChange={font => { if (isFont(font)) change({ ...value, headings: font }); }} />
        <Select label="Body, buttons and labels" options={options} value={value.body} onValueChange={font => { if (isFont(font)) change({ ...value, body: font }); }} />
        <div className="public-type-preview"><h3>Curious minds. Physical possibilities.</h3><p>Meet people, share ideas and build something together.</p></div>
        <Button variant="ghost" onClick={() => change(defaults)}>Reset to Manrope</Button>
      </div>
    </Dialog>
  </>;
}
