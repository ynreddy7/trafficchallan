import { describe, it, expect } from 'vitest';
import { buildIcs, escapeIcsText, foldIcsLine, type IcsEvent } from '../src/lib/ics';

const DTSTAMP_DATE = '2026-08-13';

const baseEvent: IcsEvent = {
  uid: 'lok-adalat-2026-09-12@trafficchallan.com',
  date: '2026-09-12',
  summary: 'National Lok Adalat sitting',
};

describe('escapeIcsText', () => {
  it('escapes backslash, semicolon, comma and newline', () => {
    expect(escapeIcsText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });

  it('escapes backslash first so escapes are not double-escaped', () => {
    // A literal "\;" in input must become "\\\;" not "\\\\;" mangling
    expect(escapeIcsText('\\;')).toBe('\\\\\\;');
  });

  it('normalises CRLF and lone CR to \\n', () => {
    expect(escapeIcsText('a\r\nb\rc')).toBe('a\\nb\\nc');
  });
});

describe('buildIcs structure', () => {
  const ics = buildIcs([baseEvent], DTSTAMP_DATE);

  it('uses CRLF line endings exclusively', () => {
    expect(ics).toContain('\r\n');
    // No bare LF: every \n must be preceded by \r
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
    expect(ics.endsWith('\r\n')).toBe(true);
  });

  it('has balanced BEGIN/END blocks', () => {
    const count = (re: RegExp) => (ics.match(re) ?? []).length;
    expect(count(/^BEGIN:VCALENDAR\r?$/gm)).toBe(1);
    expect(count(/^END:VCALENDAR\r?$/gm)).toBe(1);
    expect(count(/^BEGIN:VEVENT\r?$/gm)).toBe(1);
    expect(count(/^END:VEVENT\r?$/gm)).toBe(1);
  });

  it('renders an all-day DTSTART with VALUE=DATE and no timezone', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20260912\r\n');
    expect(ics).not.toContain('TZID');
  });

  it('carries the UID as given and a PRODID', () => {
    expect(ics).toContain('UID:lok-adalat-2026-09-12@trafficchallan.com\r\n');
    expect(ics).toMatch(/PRODID:.+trafficchallan/);
  });

  it('stamps DTSTAMP from the passed-in date, not the clock', () => {
    expect(ics).toContain('DTSTAMP:20260813T000000Z\r\n');
  });

  it('is deterministic: identical inputs give identical output', () => {
    expect(buildIcs([baseEvent], DTSTAMP_DATE)).toBe(ics);
  });
});

describe('buildIcs escaping in properties', () => {
  it('escapes SUMMARY and DESCRIPTION text', () => {
    const ics = buildIcs(
      [{ ...baseEvent, summary: 'Sitting; token, note', description: 'Line1\nLine2' }],
      DTSTAMP_DATE
    );
    expect(ics).toContain('SUMMARY:Sitting\\; token\\, note\r\n');
    expect(ics).toContain('DESCRIPTION:Line1\\nLine2\r\n');
  });

  it('omits DESCRIPTION when not provided', () => {
    const ics = buildIcs([baseEvent], DTSTAMP_DATE);
    expect(ics).not.toContain('DESCRIPTION:');
  });
});

describe('75-octet line folding', () => {
  it('leaves short lines unfolded', () => {
    expect(foldIcsLine('SUMMARY:short')).toBe('SUMMARY:short');
  });

  it('folds a long description so every physical line is <= 75 octets', () => {
    const long = 'National Lok Adalat: bring your challan number and vehicle papers. '.repeat(5);
    const ics = buildIcs([{ ...baseEvent, description: long }], DTSTAMP_DATE);
    const physical = ics.split('\r\n');
    const enc = new TextEncoder();
    for (const line of physical) {
      expect(enc.encode(line).length).toBeLessThanOrEqual(75);
    }
    // Continuation lines start with a single space
    const folded = physical.filter((l) => l.startsWith(' '));
    expect(folded.length).toBeGreaterThan(0);
    // Unfolding (strip CRLF+space) reconstructs the logical line intact
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('DESCRIPTION:' + long.trimEnd());
  });

  it('never splits inside a multi-byte character', () => {
    const long = 'दिल्ली लोक अदालत — टोकन विंडो खुलने की संभावित तिथि, चालान नंबर साथ रखें। '.repeat(3);
    const ics = buildIcs([{ ...baseEvent, description: long }], DTSTAMP_DATE);
    const enc = new TextEncoder();
    for (const line of ics.split('\r\n')) {
      expect(enc.encode(line).length).toBeLessThanOrEqual(75);
      // Round-trip through encode/decode must not produce replacement chars
      expect(new TextDecoder('utf-8', { fatal: true }).decode(enc.encode(line))).toBe(line);
    }
  });
});

describe('VALARM blocks', () => {
  it('emits one alarm per alarmDaysBefore entry with -P<N>D triggers', () => {
    const ics = buildIcs([{ ...baseEvent, alarmDaysBefore: [7, 1] }], DTSTAMP_DATE);
    expect((ics.match(/^BEGIN:VALARM\r?$/gm) ?? []).length).toBe(2);
    expect((ics.match(/^END:VALARM\r?$/gm) ?? []).length).toBe(2);
    expect(ics).toContain('TRIGGER:-P7D\r\n');
    expect(ics).toContain('TRIGGER:-P1D\r\n');
    expect(ics).toMatch(/ACTION:DISPLAY/);
  });

  it('emits no alarms when alarmDaysBefore is absent or empty', () => {
    expect(buildIcs([baseEvent], DTSTAMP_DATE)).not.toContain('VALARM');
    expect(buildIcs([{ ...baseEvent, alarmDaysBefore: [] }], DTSTAMP_DATE)).not.toContain('VALARM');
  });
});

describe('multiple events', () => {
  it('renders every event in order', () => {
    const ics = buildIcs(
      [
        baseEvent,
        { uid: 'lok-adalat-2026-12-12@trafficchallan.com', date: '2026-12-12', summary: 'December sitting' },
      ],
      DTSTAMP_DATE
    );
    expect((ics.match(/^BEGIN:VEVENT\r?$/gm) ?? []).length).toBe(2);
    expect(ics.indexOf('20260912')).toBeLessThan(ics.indexOf('20261212'));
  });
});
