import { describe, it, expect } from 'vitest';
import { StateSchema, OffenceSchema } from '../src/lib/schemas';

const validState = {
  slug: 'delhi', name: 'Delhi', abbr: 'DL', target_keyword: 'delhi e challan',
  portals: [{ label: 'Delhi Traffic Police', url: 'https://traffic.delhipolice.gov.in/', scope: 'both' }],
  check_steps: ['Open the portal', 'Enter vehicle number', 'View pending challans'],
  pay_steps: ['Open the portal', 'Select the challan', 'Pay via card/UPI'],
  sms_app_methods: ['mParivahan app → e-challan section'],
  court_challan_process: 'C'.repeat(120),
  payment_methods: ['UPI', 'Debit card'],
  contacts: [{ label: 'Traffic helpline', value: '011-25844444' }],
  quirks: [],
  faqs: [
    { q: 'How do I check?', a: 'A'.repeat(50) },
    { q: 'How do I pay?', a: 'B'.repeat(50) },
    { q: 'What if unpaid?', a: 'C'.repeat(50) }
  ],
  fine_overrides: {},
  sources: ['https://traffic.delhipolice.gov.in/'],
  last_verified: '2026-08-12'
};

const validOffence = {
  slug: 'driving-without-helmet', name: 'Riding without a helmet', seo_name: 'Helmet Challan Fine',
  target_keyword: 'helmet challan fine',
  mva_section: 'Section 194D, Motor Vehicles Act 1988',
  description: 'D'.repeat(100),
  base_fine_text: '₹1,000', base_fine_min: 1000, base_fine_max: 1000,
  repeat_fine_text: '₹1,000',
  licence_impact: 'Licence may be disqualified for 3 months.',
  compoundable_online: true,
  faqs: [{ q: 'Question 1?', a: 'A'.repeat(50) }, { q: 'Question 2?', a: 'B'.repeat(50) }],
  sources: ['https://www.indiacode.nic.in/'],
  last_verified: '2026-08-12'
};

describe('StateSchema', () => {
  it('accepts a valid record', () => { expect(StateSchema.parse(validState).slug).toBe('delhi'); });
  it('rejects missing sources', () => {
    expect(() => StateSchema.parse({ ...validState, sources: [] })).toThrow();
  });
  it('rejects bad last_verified format', () => {
    expect(() => StateSchema.parse({ ...validState, last_verified: '12-08-2026' })).toThrow();
  });
  it('rejects fewer than 3 FAQs', () => {
    expect(() => StateSchema.parse({ ...validState, faqs: validState.faqs.slice(0, 2) })).toThrow();
  });
  it('requires abbr', () => {
    const { abbr, ...withoutAbbr } = validState;
    expect(() => StateSchema.parse(withoutAbbr)).toThrow();
  });
  it('rejects abbr that is not exactly two uppercase letters', () => {
    expect(() => StateSchema.parse({ ...validState, abbr: 'dl' })).toThrow();
    expect(() => StateSchema.parse({ ...validState, abbr: 'DEL' })).toThrow();
  });
});

describe('OffenceSchema', () => {
  it('accepts a valid record', () => { expect(OffenceSchema.parse(validOffence).slug).toBe('driving-without-helmet'); });
  it('rejects non-url source', () => {
    expect(() => OffenceSchema.parse({ ...validOffence, sources: ['not a url'] })).toThrow();
  });
  it('accepts a record without statute_quote (optional)', () => {
    expect(OffenceSchema.parse(validOffence).statute_quote).toBeUndefined();
  });
  it('accepts a valid statute_quote', () => {
    const withQuote = {
      ...validOffence,
      statute_quote: {
        text: 'E'.repeat(45),
        attribution: 'Section 194D, Motor Vehicles Act 1988'
      }
    };
    expect(OffenceSchema.parse(withQuote).statute_quote?.attribution).toBe('Section 194D, Motor Vehicles Act 1988');
  });
  it('rejects a statute_quote with text under 40 chars', () => {
    const bad = { ...validOffence, statute_quote: { text: 'short', attribution: 'Section 194D, Motor Vehicles Act 1988' } };
    expect(() => OffenceSchema.parse(bad)).toThrow();
  });
  it('rejects a statute_quote with attribution under 5 chars', () => {
    const bad = { ...validOffence, statute_quote: { text: 'E'.repeat(45), attribution: 'Sec' } };
    expect(() => OffenceSchema.parse(bad)).toThrow();
  });
  it('requires seo_name', () => {
    const { seo_name, ...withoutSeoName } = validOffence;
    expect(() => OffenceSchema.parse(withoutSeoName)).toThrow();
    expect(() => OffenceSchema.parse({ ...validOffence, seo_name: 'Fine' })).toThrow(); // < 5 chars
  });
});
