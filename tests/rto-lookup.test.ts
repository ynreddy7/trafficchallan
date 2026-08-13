import { describe, it, expect } from 'vitest';
import { lookupRto, normalizePlate, plateSeries, type RtoLookupState } from '../src/lib/rto-lookup';
import { loadRtoFiles } from '../src/lib/data';

// The real dataset (data/rto/*.json) — MH12 → Pune, TS/TG → telangana, etc.
// Testing against it keeps the assertions honest: if the data ever loses a
// code the page's lookup depends on, this fails loudly.
const states: RtoLookupState[] = loadRtoFiles().map((r) => ({
  slug: r.slug,
  state_name: r.state_name,
  series: r.series,
  codes: r.codes
}));

describe('normalizePlate', () => {
  it('strips spaces, hyphens and dots and uppercases', () => {
    expect(normalizePlate('mh 12-ab.1234')).toBe('MH12AB1234');
  });
});

describe('plateSeries', () => {
  it('accepts a bare series and letters-then-digit shapes only', () => {
    expect(plateSeries('MH')).toBe('MH');
    expect(plateSeries('MH12AB1234')).toBe('MH');
    expect(plateSeries('KAR')).toBeNull(); // state-name attempt, not a code
    expect(plateSeries('1234')).toBeNull();
  });
});

describe('lookupRto', () => {
  it('resolves a code to its office: MH12 → Pune', () => {
    expect(lookupRto('MH12', states)).toEqual({
      kind: 'code',
      code: 'MH12',
      office: 'Pune',
      state: { slug: 'maharashtra', state_name: 'Maharashtra' }
    });
  });

  it('normalizes case, spaces, hyphens and dots: mh-12 / mh 12 / mh.12', () => {
    const expected = lookupRto('MH12', states);
    expect(lookupRto('mh-12', states)).toEqual(expected);
    expect(lookupRto('mh 12', states)).toEqual(expected);
    expect(lookupRto('mh.12', states)).toEqual(expected);
  });

  it('zero-pads a single-digit code: MH1 → MH01', () => {
    const r = lookupRto('MH1', states);
    expect(r.kind).toBe('code');
    if (r.kind === 'code') expect(r.code).toBe('MH01');
  });

  it('resolves a full registration number: MH12AB1234 → Pune', () => {
    const r = lookupRto('MH12AB1234', states);
    expect(r.kind).toBe('code');
    if (r.kind === 'code') {
      expect(r.office).toBe('Pune');
      expect(r.state.slug).toBe('maharashtra');
    }
  });

  it('answers a bare series with the state and its code count', () => {
    const r = lookupRto('MH', states);
    expect(r.kind).toBe('state');
    if (r.kind === 'state') {
      expect(r.state.slug).toBe('maharashtra');
      expect(r.codes_count).toBeGreaterThan(0);
    }
  });

  it('resolves both TS (legacy) and TG (current) to telangana', () => {
    for (const series of ['TS', 'TG']) {
      const r = lookupRto(series, states);
      expect(r.kind).toBe('state');
      if (r.kind === 'state') expect(r.state.slug).toBe('telangana');
    }
    const legacy = lookupRto('TS09', states);
    const current = lookupRto('TG09', states);
    expect(legacy.kind).toBe('code');
    expect(current.kind).toBe('code');
    if (legacy.kind === 'code') expect(legacy.state.slug).toBe('telangana');
    if (current.kind === 'code') expect(current.state.slug).toBe('telangana');
  });

  it('resolves both DD and DN to the merged dadra-nagar-haveli-daman-diu UT', () => {
    for (const series of ['DD', 'DN']) {
      const r = lookupRto(series, states);
      expect(r.kind).toBe('state');
      if (r.kind === 'state') expect(r.state.slug).toBe('dadra-nagar-haveli-daman-diu');
    }
  });

  it('recognizes a BH-series plate as Bharat series, not a state', () => {
    expect(lookupRto('22BH1234AA', states)).toEqual({ kind: 'bh' });
    expect(lookupRto('22 BH 1234 AA', states)).toEqual({ kind: 'bh' });
    expect(lookupRto('BH', states)).toEqual({ kind: 'bh' });
  });

  it('falls back to the state when the series is known but the number is unlisted', () => {
    const r = lookupRto('MH99', states);
    expect(r.kind).toBe('state');
    if (r.kind === 'state') expect(r.state.slug).toBe('maharashtra');
  });

  it('returns unknown for garbage', () => {
    expect(lookupRto('ZZ12AB1234', states)).toEqual({ kind: 'unknown' });
    expect(lookupRto('hello world', states)).toEqual({ kind: 'unknown' });
    expect(lookupRto('1234', states)).toEqual({ kind: 'unknown' });
  });

  it('returns unknown for an empty or whitespace-only string', () => {
    expect(lookupRto('', states)).toEqual({ kind: 'unknown' });
    expect(lookupRto('   ', states)).toEqual({ kind: 'unknown' });
  });
});
