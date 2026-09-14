import { describe, expect, it } from 'vitest';
import { displayMessageSchema, playlistSchema, exampleMessage, playlistFrame } from './playlist';
import { layoutMessageText, matrixPoints, minimumDuration } from './dot-matrix';

describe('OHI programmed messages', () => {
  it('accepts the event example and an intentionally empty playlist', () => {
    expect(displayMessageSchema.parse(exampleMessage)).toEqual(exampleMessage);
    expect(playlistSchema.parse({ version: 0, messages: [] }).messages).toEqual([]);
  });
  it.each([{ text: '' }, { text: 'a\nb\nc\nd' }, { text: '🤖' }, { duration: 0 }, { duration: 121 }, { speed: 0 }, { speed: 31 }, { speed: NaN }, { lines: 0 }, { lines: 4 }, { lines: 1.5 }, { text: 'x'.repeat(241) }, { text: 'x'.repeat(100), duration: 5, speed: 1 }])('rejects invalid display settings %o', patch => {
    expect(displayMessageSchema.safeParse({ ...exampleMessage, ...patch }).success).toBe(false);
  });
  it('rejects duplicate IDs, invalid versions and excess messages', () => {
    expect(playlistSchema.safeParse({ version: -1, messages: [] }).success).toBe(false);
    expect(playlistSchema.safeParse({ version: 1, messages: [exampleMessage, exampleMessage] }).success).toBe(false);
    expect(playlistSchema.safeParse({ version: 1, messages: Array(21).fill(exampleMessage) }).success).toBe(false);
  });
  it('allows enough time for the full line and end holds', () => {
    expect(minimumDuration('x'.repeat(20), 10)).toBe(11);
    expect(minimumDuration('Hi', 10)).toBe(5);
    expect(minimumDuration(exampleMessage.text, 10, 1)).toBeGreaterThan(minimumDuration(exampleMessage.text, 10, 3));
    expect(displayMessageSchema.safeParse({ ...exampleMessage, duration: 18, lines: 1 }).success).toBe(false);
    expect(displayMessageSchema.safeParse({ ...exampleMessage, duration: 18, lines: 3 }).success).toBe(true);
  });
  it('preserves legacy three-line messages', () => {
    const { lines: _lines, ...legacy } = exampleMessage;
    expect(displayMessageSchema.parse({ ...legacy, duration: 18 }).lines).toBe(3);
  });
  it.each([1, 2, 3])('lays out all words in %i rows without truncation', lines => {
    const text = layoutMessageText(exampleMessage.text, lines);
    expect(text.split('\n')).toHaveLength(lines);
    expect(text.replace(/\s+/g, ' ')).toBe(exampleMessage.text.replace(/\s+/g, ' '));
    expect(matrixPoints(text, 0, 10).every(([, y]) => y < lines * 10 - 3)).toBe(true);
    expect(layoutMessageText(exampleMessage.text.replaceAll('\n', ' '), lines).split('\n')).toHaveLength(lines);
  });
  it('keeps matching manual breaks and does not invent empty rows', () => {
    expect(layoutMessageText(exampleMessage.text, 3)).toBe(exampleMessage.text);
    expect(layoutMessageText('Hello', 3)).toBe('Hello');
  });
  it('cycles through enabled messages with face intervals', () => {
    expect(playlistFrame([exampleMessage], 0)).toBeNull();
    expect(playlistFrame([exampleMessage], 5)?.message.id).toBe(exampleMessage.id);
    expect(playlistFrame([exampleMessage], 22)?.elapsed).toBe(17);
    expect(playlistFrame([exampleMessage], exampleMessage.duration + 5)).toBeNull();
    expect(playlistFrame([{ ...exampleMessage, enabled: false }], 10)).toBeNull();
    expect(playlistFrame([], 10)).toBeNull();
  });
  it('draws crisp case-sensitive glyphs within the safe display area', () => {
    const points = matrixPoints(exampleMessage.text, 4, 10);
    expect(points.length).toBeGreaterThan(0);
    expect(points.every(([x, y]) => Number.isInteger(x) && x >= 0 && x < 35 && y >= 0 && y < 27)).toBe(true);
    expect(matrixPoints('a', 0, 10)).not.toEqual(matrixPoints('A', 0, 10));
    expect(matrixPoints('Wednesday', 4, 10)).not.toEqual(matrixPoints('Wednesday', 4, 5));
  });
});
