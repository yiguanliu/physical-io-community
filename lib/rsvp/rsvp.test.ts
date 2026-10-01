import { describe, expect, it, vi } from 'vitest';
import { CODE128_PATTERNS, code128Bars, code128Values } from './code128';
import { guessCategory, normalizeLinkedin, parseLumaCsv, rsvpEligibility, seatState, slugify, ticketCode, ticketSlug } from './model';
import { LABEL_SIZES, nameLines, renderLabelSvg, wrap } from './label';

vi.mock('@/workspace-ui/app/LogoMark', () => ({ PHYSICAL_IO_MARK_PATH: 'M0 0h460v271H0z' }));

const LUMA_HEADER = 'guest_id,name,first_name,last_name,email,phone_number,created_at,approval_status,checked_in_at,qr_code_url,ticket_name,What organisation are you affiliated with?,What is your job title?,What is your LinkedIn profile?,What makes you want to join the event?';

describe('Luma guest import', () => {
  it('maps standard and custom-question columns', () => {
    const csv = `﻿${LUMA_HEADER}\ngst-1,Ada Lovelace,Ada,Lovelace,ADA@Example.com,,2026-09-20T10:00:00.000Z,approved,,https://luma.com/check-in/x,Members,"Analytical Engines, Ltd",Robotics Engineer,linkedin.com/in/ada?trk=x,"Curious about ""bodies"""\n`;
    const { guests, errors } = parseLumaCsv(csv);
    expect(errors).toEqual([]);
    expect(guests[0]).toMatchObject({ guestId: 'gst-1', email: 'ada@example.com', fullName: 'Ada Lovelace', status: 'approved', organisation: 'Analytical Engines, Ltd', jobTitle: 'Robotics Engineer', linkedin: 'https://linkedin.com/in/ada', motivation: 'Curious about "bodies"' });
  });
  it('reads the LinkedIn question, not Luma tracking columns (real export header)', () => {
    const header = 'guest_id,name,first_name,last_name,email,phone_number,created_at,approval_status,checked_in_at,utm_source,utm_medium,utm_campaign,utm_term,utm_content,google_click_id,meta_click_id,x_click_id,linkedin_click_id,tiktok_click_id,reddit_click_id,yandex_click_id,referrer,referred_by,qr_code_url,amount,amount_tax,amount_discount,currency,coupon_code,eth_address,solana_address,survey_response_rating,survey_response_feedback,ticket_type_id,ticket_name,What organisation are you affiliated with?,What is your job title?,What is your LinkedIn profile?,What makes you want to join the event?';
    const row = 'gst-1,Ada Lovelace,Ada,Lovelace,ada@example.com,,2026-09-20T10:00:00.000Z,approved,,,,,,,,,,,,,,London,,https://luma.com/check-in/x,$0.00,$0.00,$0.00,usd,,,,,,ttype-1,Members,Analytical Engines,Robotics Engineer,https://www.linkedin.com/in/ada-lovelace,Curious';
    const { guests } = parseLumaCsv(`${header}\n${row}`);
    expect(guests[0]).toMatchObject({ linkedin: 'https://www.linkedin.com/in/ada-lovelace', organisation: 'Analytical Engines', jobTitle: 'Robotics Engineer', motivation: 'Curious' });
  });
  it('skips invalid emails and duplicate rows', () => {
    const { guests, errors } = parseLumaCsv(`${LUMA_HEADER}\n1,A,,,a@example.com,,,,,,,,,,\n2,B,,,not-an-email,,,,,,,,,,\n3,A again,,,a@example.com,,,,,,,,,,`);
    expect(guests).toHaveLength(1);
    expect(errors).toEqual(['Row 3: missing or invalid email.']);
  });
  it('rejects files without an email column', () => { expect(parseLumaCsv('name\nAda').errors[0]).toMatch(/No email column/); });
  it('drops non-LinkedIn profile links', () => {
    expect(normalizeLinkedin('https://linkedin.com.evil.test/in/x')).toBe('');
    expect(normalizeLinkedin('www.linkedin.com/in/ada/')).toBe('https://www.linkedin.com/in/ada');
  });
});

describe('RSVP rules', () => {
  it('only lets approved Luma guests choose attendance', () => {
    expect(rsvpEligibility('approved')).toBe('eligible');
    expect(rsvpEligibility('waitlist')).toBe('waitlist');
    expect(rsvpEligibility('invited')).toBe('invited');
    expect(rsvpEligibility('declined')).toBe('declined');
  });
  it('reports seats left and never goes negative when over capacity', () => {
    expect(seatState(70, 23)).toEqual({ capacity: 70, taken: 23, left: 47, full: false });
    expect(seatState(70, 70).full).toBe(true);
    expect(seatState(60, 70)).toMatchObject({ left: 0, full: true });
  });
  it('suggests a badge category from the Luma job title', () => {
    expect(guessCategory('Co-founder & CTO')).toBe('Founder');
    expect(guessCategory('Senior Software Engineer')).toBe('Engineer');
    expect(guessCategory('Partner at Example Ventures')).toBe('Investor');
    expect(guessCategory('Product Designer')).toBe('Designer');
    expect(guessCategory('Growth Marketing Lead')).toBe('Marketer');
    expect(guessCategory('Head of Operations')).toBe('Operator');
    expect(guessCategory('PhD candidate')).toBe('');
  });
  it('builds readable, unguessable ticket slugs', () => {
    expect(slugify('Zoë  Ó’Brien-Smith!')).toBe('zoe-o-brien-smith');
    expect(slugify('李雷')).toBe('guest');
    const slug = ticketSlug('Yiguan Liu', () => new Uint8Array([0, 1, 2, 3]));
    expect(slug).toBe('yiguan-liu-abcd');
    expect(ticketCode('02', slug)).toBe('02-ABCD');
    expect(ticketSlug('Yiguan Liu')).toMatch(/^yiguan-liu-[a-z2-9]{4}$/);
  });
});

describe('Code 128 barcode', () => {
  it('uses well-formed patterns', () => {
    expect(new Set(CODE128_PATTERNS).size).toBe(107);
    CODE128_PATTERNS.forEach((pattern, i) => expect([...pattern].reduce((sum, width) => sum + Number(width), 0)).toBe(i === 106 ? 13 : 11));
  });
  it('encodes set B with the standard checksum', () => {
    // Start B (104) + weighted values, modulo 103.
    expect(code128Values('02-ABCD')).toEqual([104, 16, 18, 13, 33, 34, 35, 36, 32, 106]);
    expect(code128Bars('02-ABCD').modules).toBe(11 * 9 + 13);
    expect(() => code128Values('café')).toThrow();
  });
});

describe('thermal label', () => {
  const data = { name: 'Yiguan Liu', jobTitle: 'Founder', organisation: 'Physical <I/O>', linkedin: 'https://www.linkedin.com/in/example', ticketUrl: 'https://www.physical-io.com/t', code: '02-ABCD', attendance: 'in_person' as const, episode: { number: '02', title: 'Robotics', theme: 'Love, Mind + Body', date: '07.10.2026', time: '18:00 ~ 21:00', room: 'LG17 BENTHAM HOUSE', address: ['Endsleigh Gardens', 'London WC1H 0EG'] } };
  it('renders every stock size at its physical dimensions in pure black and white', () => {
    for (const size of LABEL_SIZES) {
      const svg = renderLabelSvg(data, size.id);
      expect(svg).toContain(`width="${size.width}mm" height="${size.height}mm"`);
      expect(svg.match(/#[0-9a-f]{3,6}/gi)?.every(color => ['#fff', '#000'].includes(color.toLowerCase()))).toBe(true);
    }
  });
  it('escapes attendee text', () => {
    const svg = renderLabelSvg(data);
    expect(svg).toContain('Physical &lt;I/O&gt;');
    expect(svg).not.toContain('<I/O>');
  });
  it('prints the job title without a role line or trailing full stop, and the address under the room', () => {
    const svg = renderLabelSvg(data);
    expect(svg).toContain('Founder, Physical &lt;I/O&gt;<');
    expect(svg).not.toContain('ROLE:');
    expect(svg.indexOf('ROOM: LG17 BENTHAM HOUSE')).toBeLessThan(svg.indexOf('ENDSLEIGH GARDENS'));
    expect(svg).toContain('LONDON WC1H 0EG');
    expect(renderLabelSvg({ ...data, attendance: 'online' })).not.toContain('ENDSLEIGH GARDENS');
  });
  it('marks admin tickets', () => {
    const svg = renderLabelSvg({ ...data, attendance: 'admin' });
    expect(svg).toContain('TICKET: ADMIN');
    expect(svg).toContain('>ADMIN<');
    expect(svg).not.toContain('PERSON');
  });
  it('wraps long text and splits names into headline lines', () => {
    expect(wrap('Co-founder and Chief Technology Officer at a very long organisation', 20, 2)).toEqual(['Co-founder and Chief', 'Technology Officer…']);
    expect(nameLines('Yiguan Liu')).toEqual(['YIGUAN', 'LIU']);
    expect(nameLines('Ava Maria de la Cruz')).toEqual(['AVA', 'MARIA DE LA', 'CRUZ']);
  });
});
