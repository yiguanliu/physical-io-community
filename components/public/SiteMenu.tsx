'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Info, Menu, Settings2 } from 'lucide-react';
import { IconButton, Popover } from '@/workspace-ui/src';
import TypographySettings, { ThemeSwitch } from './TypographySettings';

/** One header menu: About, Events, the day/night switch and theme/font settings. */
export default function SiteMenu({ dark, onToggleTheme, member = false }: { dark: boolean; onToggleTheme: () => void; member?: boolean }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return <>
    <Popover side="bottom" align="end" title="Menu" closeLabel="Close menu" trigger={<IconButton label="Menu" variant="ghost" className="public-menu-button"><Menu size={20} aria-hidden /></IconButton>}>
      <div className="public-menu">
        {!member && <nav aria-label="Main">
          <Link href="/about" aria-current={pathname === '/about' ? 'page' : undefined}><Info size={18} aria-hidden />About</Link>
          <Link href="/events" aria-current={pathname === '/events' ? 'page' : undefined}><CalendarDays size={18} aria-hidden />Events</Link>
        </nav>}
        <ThemeSwitch dark={dark} onToggleTheme={onToggleTheme} />
        <button type="button" className="public-menu-item" onClick={() => setSettingsOpen(true)}><Settings2 size={18} aria-hidden />Fonts and settings</button>
      </div>
    </Popover>
    {/* Kept outside the popover so it stays open when the menu closes. */}
    <TypographySettings dark={dark} onToggleTheme={onToggleTheme} open={settingsOpen} onOpenChange={setSettingsOpen} />
  </>;
}
