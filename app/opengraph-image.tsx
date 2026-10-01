import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { PHYSICAL_IO_MARK_PATH } from '@/workspace-ui/app/LogoMark';

export const alt = 'Physical I/O: a Physical AI community';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Link preview: the black Physical I/O banner (mark, wordmark, dot-font line) at the 1200 × 630 share size. */
export default async function Image() {
  const publicDir = join(process.cwd(), 'public');
  const [dotFont, wordmark] = await Promise.all([
    readFile(join(publicDir, 'fonts/bitcount-grid-single/BitcountGridSingle-Regular.ttf')),
    readFile(join(publicDir, 'assets/physical-io-wordmark.png')),
  ]);
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#000', padding: '64px 72px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <svg width="92" height="54" viewBox="0 0 460 271"><path fill="#fff" d={PHYSICAL_IO_MARK_PATH} /></svg>
        <img src={`data:image/png;base64,${wordmark.toString('base64')}`} width={258} height={54} alt="" />
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 54 }}>
        <div style={{ display: 'flex', fontFamily: 'Bitcount', fontSize: 54, letterSpacing: 2, color: '#e9e9e9' }}>A PHYSICAL AI COMMUNITY</div>
      </div>
    </div>,
    { ...size, fonts: [{ name: 'Bitcount', data: dotFont, style: 'normal', weight: 400 }] },
  );
}
