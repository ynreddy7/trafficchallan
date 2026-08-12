import { describe, it, expect } from 'vitest';
import { relatedForState, relatedForOffence } from '../src/lib/links';
import type { StateRecord, OffenceRecord } from '../src/lib/schemas';

const mkOffence = (slug: string): OffenceRecord => ({
  slug, name: slug, target_keyword: slug, mva_section: 'S', description: 'D'.repeat(100),
  base_fine_text: '₹1', base_fine_min: 1, base_fine_max: 1, repeat_fine_text: '₹2',
  licence_impact: 'None', compoundable_online: true,
  faqs: [{ q: 'Question?', a: 'A'.repeat(50) }, { q: 'Question2?', a: 'B'.repeat(50) }],
  sources: ['https://x.gov.in/'], last_verified: '2026-08-01'
} as OffenceRecord);

const mkState = (slug: string, overrides: string[] = []): StateRecord => ({
  slug, name: slug.toUpperCase(), target_keyword: slug, portals: [{ label: 'P', url: 'https://x.gov.in/', scope: 'both' }],
  check_steps: ['Step number one', 'Step number two', 'Step number three'],
  pay_steps: ['Step number one', 'Step number two', 'Step number three'],
  sms_app_methods: [], court_challan_process: 'C'.repeat(120), payment_methods: ['UPI'],
  contacts: [], quirks: [],
  faqs: [{ q: 'Question one?', a: 'A'.repeat(50) }, { q: 'Question two?', a: 'B'.repeat(50) }, { q: 'Question three?', a: 'C'.repeat(50) }],
  fine_overrides: Object.fromEntries(overrides.map((o) => [o, { amount_text: '₹1', source: 'https://x.gov.in/' }])),
  sources: ['https://x.gov.in/'], last_verified: '2026-08-01'
} as StateRecord);

describe('relatedForState', () => {
  it('prioritizes overridden offences, caps at 8, includes fines hub', () => {
    const offences = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(mkOffence);
    const items = relatedForState(mkState('delhi', ['h', 'i']), offences, []);
    expect(items.length).toBeLessThanOrEqual(8);
    expect(items.some((l) => l.href === '/fines/')).toBe(true);
    expect(items[0].href).toBe('/fines/h/');
    expect(items[1].href).toBe('/fines/i/');
  });

  it('exercises 8-item cap with guides surviving at tail', () => {
    const offences = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(mkOffence);
    const items = relatedForState(mkState('delhi', ['h']), offences, ['guide-one', 'guide-two']);
    expect(items.length).toBe(8);
    expect(items.some((l) => l.href === '/guide-one/')).toBe(true);
    expect(items.some((l) => l.href === '/guide-two/')).toBe(true);
  });
});

describe('relatedForOffence', () => {
  it('links states with overrides first, then others, ≥2 states', () => {
    const states = [mkState('delhi'), mkState('telangana', ['x']), mkState('maharashtra')];
    const items = relatedForOffence(mkOffence('x'), states, []);
    expect(items[0].href).toBe('/telangana-e-challan/');
    expect(items.filter((l) => l.href.endsWith('-e-challan/')).length).toBeGreaterThanOrEqual(2);
    expect(items.some((l) => l.href === '/calculator/')).toBe(true);
  });

  it('prioritizes override states and verifies ordering: both overrides bubble up', () => {
    const states = [mkState('delhi'), mkState('telangana', ['x']), mkState('maharashtra', ['x'])];
    const items = relatedForOffence(mkOffence('x'), states, []);
    expect(items[0].href).toBe('/telangana-e-challan/');
    expect(items[1].href).toBe('/maharashtra-e-challan/');
  });

  it('guarantees ≥2 state links with exactly 2 states and no overrides', () => {
    const states = [mkState('delhi'), mkState('maharashtra')];
    const items = relatedForOffence(mkOffence('x'), states, []);
    const stateLinks = items.filter((l) => l.href.endsWith('-e-challan/'));
    expect(stateLinks.length).toBeGreaterThanOrEqual(2);
    expect(stateLinks.some((l) => l.href === '/delhi-e-challan/')).toBe(true);
    expect(stateLinks.some((l) => l.href === '/maharashtra-e-challan/')).toBe(true);
  });
});
