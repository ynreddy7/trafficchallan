import { describe, it, expect } from 'vitest';
import { runGates, type GateInput } from '../src/lib/gate';
import type { StateRecord, OffenceRecord } from '../src/lib/schemas';

const state = (over: Partial<StateRecord>): StateRecord => ({
  slug: 'delhi', name: 'Delhi', target_keyword: 'delhi e challan',
  portals: [{ label: 'P', url: 'https://example.gov.in/', scope: 'both' }],
  check_steps: ['Step one here', 'Step two here', 'Step three here'],
  pay_steps: ['Step one here', 'Step two here', 'Step three here'],
  sms_app_methods: [], court_challan_process: 'C'.repeat(120),
  payment_methods: ['UPI'], contacts: [], quirks: [],
  faqs: [
    { q: 'Question one?', a: 'A'.repeat(50) },
    { q: 'Question two?', a: 'B'.repeat(50) },
    { q: 'Question three?', a: 'C'.repeat(50) }
  ],
  fine_overrides: {}, sources: ['https://example.gov.in/'], last_verified: '2026-08-01',
  ...over
});

const offence = (over: Partial<OffenceRecord>): OffenceRecord => ({
  slug: 'no-helmet', name: 'No helmet', target_keyword: 'helmet fine',
  mva_section: 'Section 194D', description: 'D'.repeat(100),
  base_fine_text: '₹1,000', base_fine_min: 1000, base_fine_max: 1000,
  repeat_fine_text: '₹1,000', licence_impact: 'None', compoundable_online: true,
  faqs: [{ q: 'Question one?', a: 'A'.repeat(50) }, { q: 'Question two?', a: 'B'.repeat(50) }],
  sources: ['https://example.gov.in/'], last_verified: '2026-08-01',
  ...over
});

const base: GateInput = {
  states: [state({})], offences: [offence({})], guides: [], now: new Date('2026-08-12')
};

describe('runGates', () => {
  it('passes clean input', () => { expect(runGates(base)).toEqual([]); });
  it('flags last_verified older than 90 days', () => {
    const v = runGates({ ...base, states: [state({ last_verified: '2026-01-01' })] });
    expect(v.join(' ')).toMatch(/stale/i);
  });
  it('flags duplicate target_keyword across page types', () => {
    const v = runGates({ ...base, offences: [offence({ target_keyword: 'delhi e challan' })] });
    expect(v.join(' ')).toMatch(/duplicate target_keyword/i);
  });
  it('flags fine_overrides referencing unknown offence slug', () => {
    const v = runGates({
      ...base,
      states: [state({ fine_overrides: { 'ghost-offence': { amount_text: '₹1', source: 'https://x.gov.in/' } } })]
    });
    expect(v.join(' ')).toMatch(/ghost-offence/);
  });
  it('flags guide missing sources', () => {
    const v = runGates({
      ...base,
      guides: [{ file: 'g.md', target_keyword: 'how to pay challan', last_verified: '2026-08-01', sources: [] }]
    });
    expect(v.join(' ')).toMatch(/g\.md.*source/i);
  });
});
