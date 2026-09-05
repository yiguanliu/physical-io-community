export const physicalIOBrand = {
  accent: '#ee4b1a',
  fontFamily: '"Manrope", Arial, Helvetica, sans-serif',
  spacing: { controlGap: 12, sectionGap: 24, pageInset: 24, cardInset: 16 },
} as const;
export type Theme = { palette?: 'brand' | 'minimal'; accent: string; mode: 'light' | 'dark'; font: 'brand' | 'sans' | 'humanist' | 'mono'; density: 'comfortable' | 'compact'; hierarchy: 'quiet' | 'expressive' };
export const defaultTheme: Theme = { palette: 'brand', accent: physicalIOBrand.accent, mode: 'light', font: 'brand', density: 'comfortable', hierarchy: 'expressive' };
export const minimalTheme: Theme = { ...defaultTheme, palette: 'minimal', accent: '#171717' };
export function luminance(hex: string): number {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('Use a six-digit hex color.');
  const rgb = [1, 3, 5].map(i => { const n = parseInt(hex.slice(i, i + 2), 16) / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
export function contrast(a: string, b: string) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
export function themeColors(accent: string) {
  const valid = /^#[\da-f]{6}$/i.test(accent) ? accent : defaultTheme.accent;
  const rgb = [1, 3, 5].map(i => parseInt(valid.slice(i, i + 2), 16));
  const shade = (factor: number) => '#' + rgb.map(n => Math.floor(n * factor).toString(16).padStart(2, '0')).join('');
  let factor = 1;
  while (contrast(shade(factor), '#ffffff') < 4.5) factor = Math.max(0, factor - .01);
  return { action: shade(factor), actionHover: shade(factor * .9), onAction: '#ffffff', accent: valid, onAccent: contrast(valid, '#ffffff') >= contrast(valid, '#000000') ? '#ffffff' : '#000000' };
}
