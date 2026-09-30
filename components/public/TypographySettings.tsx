'use client';

import { useEffect, useState } from 'react';
import { Button, Dialog, Select, Switch } from '@/workspace-ui/src';

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
  document.documentElement.style.setProperty('--font-public-body-weight', value.body === 'dot' ? '600' : '500');
  document.documentElement.style.setProperty('--font-public-heading-weight', value.headings === 'rokkitt' ? '400' : '600');
}
/** Night mode on/off, using the shared Switch toggle. */
function ThemeSwitch({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  return <div className="public-theme-toggle"><Switch label="Night mode" checked={dark} onCheckedChange={checked => { if (checked !== dark) onToggleTheme(); }} /></div>;
}

/** Theme and font settings. Always mounted so saved fonts apply on every page. */
export default function TypographySettings({ dark, onToggleTheme, open, onOpenChange: setOpen }: { dark: boolean; onToggleTheme: () => void; open: boolean; onOpenChange: (open: boolean) => void }) {
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
    <Dialog open={open} onOpenChange={setOpen} title="Settings" description="Choose your theme and fonts. Changes appear immediately and are remembered on this device.">
      <div className="public-text-settings">
        <ThemeSwitch dark={dark} onToggleTheme={onToggleTheme} />
        <div className="public-font-row">
          <Select label="Heading font" options={options} value={value.headings} onValueChange={font => { if (isFont(font)) change({ ...value, headings: font }); }} />
          <Select label="Body, buttons and labels" options={options} value={value.body} onValueChange={font => { if (isFont(font)) change({ ...value, body: font }); }} />
        </div>
        <div className="public-type-preview"><h3>Curious minds. Physical possibilities.</h3><p>Meet people, share ideas and build something together.</p></div>
        <Button variant="ghost" onClick={() => change(defaults)}>Reset to Manrope</Button>
      </div>
    </Dialog>
  </>;
}
