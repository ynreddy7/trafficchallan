import { describe, it, expect } from 'vitest';
import { resolveVehicleInput, type RtoStateEntry } from '../src/lib/portal-finder';

// Mirrors the RTO-code map that ships in src/pages/index.astro's frontmatter:
// AP DL GJ HR JK KA MP MH RJ TN TS TG UP WB — TS and TG both resolve to telangana.
const states: RtoStateEntry[] = [
  { slug: 'andhra-pradesh', name: 'Andhra Pradesh', code: 'AP' },
  { slug: 'delhi', name: 'Delhi', code: 'DL' },
  { slug: 'gujarat', name: 'Gujarat', code: 'GJ' },
  { slug: 'haryana', name: 'Haryana', code: 'HR' },
  { slug: 'jammu-kashmir', name: 'Jammu and Kashmir', code: 'JK' },
  { slug: 'karnataka', name: 'Karnataka', code: 'KA' },
  { slug: 'madhya-pradesh', name: 'Madhya Pradesh', code: 'MP' },
  { slug: 'maharashtra', name: 'Maharashtra', code: 'MH' },
  { slug: 'rajasthan', name: 'Rajasthan', code: 'RJ' },
  { slug: 'tamil-nadu', name: 'Tamil Nadu', code: 'TN' },
  { slug: 'telangana', name: 'Telangana', code: 'TS' },
  { slug: 'telangana', name: 'Telangana', code: 'TG' },
  { slug: 'uttar-pradesh', name: 'Uttar Pradesh', code: 'UP' },
  { slug: 'west-bengal', name: 'West Bengal', code: 'WB' }
];

describe('resolveVehicleInput', () => {
  it('parses a full vehicle registration number', () => {
    expect(resolveVehicleInput('MH12AB1234', states)).toEqual({ kind: 'state', slug: 'maharashtra' });
  });

  it('is case-insensitive on a vehicle registration number', () => {
    expect(resolveVehicleInput('ts09ea5555', states)).toEqual({ kind: 'state', slug: 'telangana' });
  });

  it('resolves a bare RTO code', () => {
    expect(resolveVehicleInput('TG', states)).toEqual({ kind: 'state', slug: 'telangana' });
  });

  it('matches a typed state name exactly', () => {
    expect(resolveVehicleInput('karnataka', states)).toEqual({ kind: 'state', slug: 'karnataka' });
  });

  it('matches a typed state name by prefix (min 3 chars)', () => {
    expect(resolveVehicleInput('Kar', states)).toEqual({ kind: 'state', slug: 'karnataka' });
  });

  it('flags a known-but-uncovered RTO code as unknown-code', () => {
    expect(resolveVehicleInput('KL01', states)).toEqual({ kind: 'unknown-code', code: 'KL' });
  });

  it('returns invalid for nonsense input', () => {
    expect(resolveVehicleInput('xx', states)).toEqual({ kind: 'invalid' });
  });

  it('returns invalid for empty input', () => {
    expect(resolveVehicleInput('', states)).toEqual({ kind: 'invalid' });
  });

  it('returns invalid for whitespace-only input', () => {
    expect(resolveVehicleInput('   ', states)).toEqual({ kind: 'invalid' });
  });

  it('ignores spaces and hyphens in a vehicle registration number', () => {
    expect(resolveVehicleInput('MH 12 AB 1234', states)).toEqual({ kind: 'state', slug: 'maharashtra' });
    expect(resolveVehicleInput('MH-12-AB-1234', states)).toEqual({ kind: 'state', slug: 'maharashtra' });
  });

  it('flags every documented known-but-uncovered code', () => {
    const codes = ['KL', 'PB', 'BR', 'OD', 'CH', 'UK', 'DN', 'LA', 'PY', 'SK', 'GA', 'AS', 'ML', 'MN', 'MZ', 'NL', 'TR', 'AR', 'HP', 'JH', 'CG', 'BH', 'AN', 'LD', 'DD'];
    for (const code of codes) {
      expect(resolveVehicleInput(code, states)).toEqual({ kind: 'unknown-code', code });
    }
  });

  it('is case-insensitive for a known-but-uncovered code', () => {
    expect(resolveVehicleInput('kl', states)).toEqual({ kind: 'unknown-code', code: 'KL' });
  });

  it('flags the Andaman & Nicobar / Lakshadweep / Daman & Diu codes as known-but-uncovered', () => {
    expect(resolveVehicleInput('AN01A1234', states)).toEqual({ kind: 'unknown-code', code: 'AN' });
    expect(resolveVehicleInput('LD', states)).toEqual({ kind: 'unknown-code', code: 'LD' });
    expect(resolveVehicleInput('DD', states)).toEqual({ kind: 'unknown-code', code: 'DD' });
  });
});
