import { describe, it, expect } from 'vitest';
import { computeFine } from '../src/lib/fine-calc';
import type { StateRecord, OffenceRecord } from '../src/lib/schemas';

const offence = {
  slug: 'driving-without-helmet', name: 'No helmet', target_keyword: 'x',
  mva_section: 'Section 194D', description: 'D'.repeat(100),
  base_fine_text: '₹1,000', base_fine_min: 1000, base_fine_max: 1000,
  repeat_fine_text: '₹1,500', licence_impact: 'None', compoundable_online: true,
  faqs: [{ q: 'Question?', a: 'A'.repeat(50) }, { q: 'Question2?', a: 'B'.repeat(50) }],
  sources: ['https://x.gov.in/'], last_verified: '2026-08-01'
} as OffenceRecord;

const stateWithOverride = {
  fine_overrides: { 'driving-without-helmet': { amount_text: '₹500 (Delhi notified)', source: 'https://d.gov.in/' } }
} as unknown as StateRecord;

describe('computeFine', () => {
  it('returns base fine with no state', () => {
    const r = computeFine(offence, null, false);
    expect(r.text).toBe('₹1,000');
    expect(r.overridden).toBe(false);
    expect(r.sectionNote).toContain('194D');
  });
  it('returns repeat fine when repeat=true', () => {
    expect(computeFine(offence, null, true).text).toBe('₹1,500');
  });
  it('state override wins over base and repeat', () => {
    const r = computeFine(offence, stateWithOverride, true);
    expect(r.text).toBe('₹500 (Delhi notified)');
    expect(r.overridden).toBe(true);
    expect(r.overrideSource).toBe('https://d.gov.in/');
  });
});
