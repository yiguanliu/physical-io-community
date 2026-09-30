import QRCode from 'qrcode';
import { code128Bars } from './code128';
import { PHYSICAL_IO_MARK_PATH } from '@/workspace-ui/app/LogoMark';

// Thermal label artwork. One SVG drives the screen preview, printing and PNG export.
// Units are millimetres; the layout is designed on a 100mm-wide grid and scaled by width.
// Direct-thermal printers only print black, so there are no greys, tints or hairlines.

export const LABEL_SIZES = [
  { id: '100x150', label: '100 × 150 mm (4 × 6 in)', width: 100, height: 150 },
  { id: '100x180', label: '100 × 180 mm', width: 100, height: 180 },
  { id: '62x100', label: '62 × 100 mm (Brother QL)', width: 62, height: 100 },
] as const;
export type LabelSizeId = (typeof LABEL_SIZES)[number]['id'];
export function labelSize(id: string) { return LABEL_SIZES.find(size => size.id === id) ?? LABEL_SIZES[0]; }

export type LabelData = {
  name: string;
  category: string;
  jobTitle: string;
  organisation: string;
  linkedin: string;
  ticketUrl: string;
  code: string;
  attendance: 'in_person' | 'online';
  episode: { number: string; title: string; theme: string; date: string; time: string; room: string };
};

const FONT = `'Helvetica Neue',Helvetica,Arial,sans-serif`;
const MONO = `'SF Mono',Menlo,Consolas,'Courier New',monospace`;
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const n = (value: number) => Number(value.toFixed(3));
// Average advance widths (em) for Helvetica; slightly generous so text never clips.
const BOLD_CAPS = .7, REGULAR = .52, CAPS = .66;

function text(x: number, y: number, size: number, content: string, options: { weight?: number; anchor?: 'start' | 'middle' | 'end'; font?: string; spacing?: number } = {}) {
  // Inline !important keeps host-page typography rules from restyling the artwork on screen.
  return `<text x="${n(x)}" y="${n(y)}" font-size="${n(size)}" style="font-family:${options.font ?? FONT}!important;font-weight:${options.weight ?? 400}!important;font-size-adjust:none!important"${options.anchor && options.anchor !== 'start' ? ` text-anchor="${options.anchor}"` : ''}${options.spacing ? ` letter-spacing="${n(options.spacing)}"` : ''}>${escape(content)}</text>`;
}

/** Greedy word wrap into at most `max` lines of `perLine` characters; the last line is truncated. */
export function wrap(value: string, perLine: number, max: number) {
  const lines: string[] = [];
  for (const word of value.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + ' ' + word).length <= perLine) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length > max) {
    lines.length = max;
    const last = lines[max - 1];
    lines[max - 1] = (last.length < perLine ? last : last.replace(/\s*\S*$/, '')) + '…';
  }
  return lines.map(line => line.length > perLine ? line.slice(0, perLine - 1) + '…' : line);
}

/** Splits a name into up to three headline lines, balancing length. */
export function nameLines(name: string) {
  const words = name.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return words.length ? words : ['GUEST'];
  if (words.length === 3) return [words[0], words.slice(1).join(' ')];
  return [words[0], words.slice(1, -1).join(' '), words[words.length - 1]];
}

function qrPath(value: string, x: number, y: number, size: number) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const count = qr.modules.size, cell = size / count;
  let d = '';
  for (let row = 0; row < count; row++) {
    let run = -1;
    for (let col = 0; col <= count; col++) {
      const dark = col < count && qr.modules.get(row, col);
      if (dark && run < 0) run = col;
      if (!dark && run >= 0) { d += `M${n(x + run * cell)} ${n(y + row * cell)}h${n((col - run) * cell)}v${n(cell)}h${n(-(col - run) * cell)}z`; run = -1; }
    }
  }
  return `<path d="${d}" shape-rendering="crispEdges"/>`;
}

function barcode(value: string, x: number, y: number, width: number, height: number) {
  const { bars, modules } = code128Bars(value);
  const module = width / modules;
  return `<path d="${bars.map(([start, w]) => `M${n(x + start * module)} ${n(y)}h${n(w * module)}v${n(height)}h${n(-w * module)}z`).join('')}" shape-rendering="crispEdges"/>`;
}

export function renderLabelSvg(data: LabelData, sizeId: string = '100x150') {
  const size = labelSize(sizeId);
  const s = size.width / 100, H = size.height / s, W = 100, m = 6;
  const parts: string[] = [];
  const episode = `PHYSICAL I/O ${data.episode.number}`;

  // Header: ticket marker left, the episode "contents" block right (after the reference pack label).
  parts.push(text(m, 12, 2.8, 'ADMIT ONE', { weight: 700, spacing: .2 }));
  parts.push(text(m, 15.6, 2.6, data.code, { font: MONO }));
  parts.push(text(50, 12, 2.6, `${episode} -`, { weight: 700 }), text(50, 15.2, 2.6, 'CONTENTS:', { weight: 700 }));
  data.episode.theme.toUpperCase().split(/\s*[,+]\s*/).slice(0, 3).forEach((item, i) => parts.push(text(76, 12 + i * 3.2, 2.6, `${i ? '- ' : ''}${item} / 0${i + 1}`)));

  // Bottom block, measured upward from the bottom margin.
  const brandY = H - m, qr = 24, qrY = brandY - 9 - qr, barH = 11, barY = qrY - 6 - 4.2 - barH, rule = barY - 6;
  // Headline + tagline fill the space above the rule.
  const lines = nameLines(data.name);
  const tagline = [data.jobTitle || data.category, data.organisation].filter(Boolean).join(', ');
  const tagLines = tagline ? wrap(`${tagline}.`, 34, 2) : [];
  const top = 26, tagBlock = tagLines.length * 6.2 + (tagLines.length ? 5 : 0);
  const longest = Math.max(...lines.map(line => line.length));
  const size0 = Math.min(26, (W - 2 * m) / (longest * BOLD_CAPS), (rule - 5 - tagBlock - top) / (lines.length * .96));
  lines.forEach((line, i) => parts.push(text(m - size0 * .04, top + size0 * (.76 + i * .96), size0, line, { weight: 700, spacing: -size0 * .035 })));
  const tagTop = top + size0 * (lines.length * .96) + 4;
  tagLines.forEach((line, i) => parts.push(text(m, tagTop + 4.6 + i * 6.2, 5.2, line)));
  parts.push(`<rect x="${m}" y="${n(rule)}" width="${W - 2 * m}" height=".5"/>`);

  // Check-in barcode with its human-readable code, then the specification list.
  const barW = 44;
  parts.push(barcode(data.code, m, barY, barW, barH));
  parts.push(text(m + barW / 2, barY + barH + 3.8, 3.4, data.code.split('').join(' '), { font: MONO, anchor: 'middle', weight: 700 }));
  const specs = [
    `TICKET: ${data.attendance === 'online' ? 'ONLINE' : 'IN PERSON'}`,
    `ROLE: ${(data.category || 'GUEST').toUpperCase()}`,
    `DATE: ${data.episode.date}`,
    `TIME: ${data.episode.time}`,
    data.attendance === 'online' ? 'ROOM: GOOGLE MEET' : `ROOM: ${data.episode.room}`,
  ];
  const specX = m + barW + 4, specSize = Math.min(3.5, (W - m - specX) / (Math.max(...specs.map(x => x.length)) * CAPS));
  specs.forEach((line, i) => parts.push(text(specX, barY + 2.6 + i * (barH + 4) / 5, specSize, line)));

  // LinkedIn QR (falls back to the ticket page), then the attendance mark.
  parts.push(qrPath(data.linkedin || data.ticketUrl, m, qrY, qr));
  parts.push(text(m + qr + 4, qrY + 3, 2.6, data.linkedin ? 'SCAN TO CONNECT' : 'SCAN FOR TICKET', { weight: 700 }));
  parts.push(text(m + qr + 4, qrY + 6.2, 2.6, data.linkedin ? 'ON LINKEDIN' : 'DETAILS'));
  const mark = data.attendance === 'online' ? 'ONLINE' : 'IN PERSON';
  const markSize = Math.min(11, (W - m - (m + qr + 4)) / (mark.length * BOLD_CAPS));
  parts.push(text(W - m, qrY + qr - markSize * .9 - 1.4, 3, `EP.${data.episode.number} ${data.episode.title.toUpperCase()}`, { anchor: 'end', weight: 700 }));
  parts.push(text(W - m + markSize * .04, qrY + qr, markSize, mark, { anchor: 'end', weight: 700, spacing: -markSize * .03 }));

  // Footer: wordmark and serial number.
  const markH = 4.6, markScale = markH / 271;
  parts.push(`<path transform="translate(${m} ${n(brandY - markH)}) scale(${n(markScale * 1000) / 1000})" d="${PHYSICAL_IO_MARK_PATH}"/>`);
  parts.push(text(m + 460 * markScale + 2.4, brandY, 6.2, 'PHYSICAL I/O', { weight: 800, spacing: -.15 }));
  parts.push(text(W - m, brandY, 2.6, `SN: PIO-EP${data.code}`, { anchor: 'end' }));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}mm" height="${size.height}mm" viewBox="0 0 ${W} ${n(H)}" role="img" aria-label="${escape(`Event label for ${data.name}`)}"><rect width="${W}" height="${n(H)}" fill="#fff"/><g fill="#000">${parts.join('')}</g></svg>`;
}
