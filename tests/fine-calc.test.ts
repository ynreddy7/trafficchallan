import { describe, it, expect } from 'vitest';
import { computeFine, totalFines, type FineResult } from '../src/lib/fine-calc';
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

const asResult = (text: string): FineResult => ({ text, overridden: false, sectionNote: 'x' });

describe('totalFines', () => {
  it('sums two determinate single-figure amounts', () => {
    const r = totalFines([asResult('₹1,000'), asResult('₹500 (Delhi notified)')]);
    expect(r).toEqual({ total: 1500, determinate: true });
  });

  it('parses a leading amount past a trailing descriptive clause (override text)', () => {
    const r = totalFines([asResult('₹500 (Delhi notified)')]);
    expect(r).toEqual({ total: 500, determinate: true });
  });

  it('parses a leading amount past a trailing prose clause', () => {
    const r = totalFines([asResult('₹1,000 fine and disqualification from holding a driving licence for three months')]);
    expect(r).toEqual({ total: 1000, determinate: true });
  });

  it('returns null when any line is a dash-connected range', () => {
    const r = totalFines([asResult('₹1,000'), asResult('₹1,000-2,000 depending on vehicle class')]);
    expect(r.total).toBeNull();
    expect(r.determinate).toBe(false);
  });

  it('returns null when any line is a "to"-connected range', () => {
    const r = totalFines([asResult('₹1,000 to ₹2,000')]);
    expect(r.total).toBeNull();
    expect(r.determinate).toBe(false);
  });

  it('returns null when any line is a court-decided amount with no leading figure', () => {
    const r = totalFines([asResult('₹1,000'), asResult('Court challan — subject to the discretion of the Hon\'ble court')]);
    expect(r.total).toBeNull();
    expect(r.determinate).toBe(false);
  });

  it('returns null when any line does not lead with a rupee figure', () => {
    const r = totalFines([asResult('First offence: imprisonment up to 3 months, or a fine of ₹2,000, or both')]);
    expect(r.total).toBeNull();
    expect(r.determinate).toBe(false);
  });

  it('is vacuously determinate with a zero total for no selected offences', () => {
    expect(totalFines([])).toEqual({ total: 0, determinate: true });
  });

  it('returns null when a "/"-delimited dual amount is written as a single field', () => {
    const r = totalFines([asResult('₹5,000/₹10,000')]);
    expect(r.total).toBeNull();
    expect(r.determinate).toBe(false);
  });

  it('returns null when a "/"-delimited dual amount has a space before the slash', () => {
    const r = totalFines([asResult('₹5,000 /₹10,000 for a repeat offence')]);
    expect(r.total).toBeNull();
    expect(r.determinate).toBe(false);
  });

  it('returns null when a "/"-delimited dual amount has no rupee sign on the second figure', () => {
    const r = totalFines([asResult('₹5,000/10,000 depending on vehicle class')]);
    expect(r.total).toBeNull();
    expect(r.determinate).toBe(false);
  });

  it('does not misfire on a slash that is not immediately after the figure', () => {
    const r = totalFines([asResult('₹1,000 for a two/three-wheeler')]);
    expect(r).toEqual({ total: 1000, determinate: true });
  });
});
