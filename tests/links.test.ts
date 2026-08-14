import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { relatedForState, relatedForOffence, relatedForFineList, rotatedGuides, type GuideRef } from '../src/lib/links';
import type { StateRecord, OffenceRecord } from '../src/lib/schemas';

const mkOffence = (slug: string): OffenceRecord => ({
  slug, name: slug, seo_name: `${slug} fine`, target_keyword: slug, mva_section: 'S', description: 'D'.repeat(100),
  base_fine_text: '₹1', base_fine_min: 1, base_fine_max: 1, repeat_fine_text: '₹2',
  licence_impact: 'None', compoundable_online: true,
  faqs: [{ q: 'Question?', a: 'A'.repeat(50) }, { q: 'Question2?', a: 'B'.repeat(50) }],
  sources: ['https://x.gov.in/'], last_verified: '2026-08-01'
} as OffenceRecord);

const mkState = (slug: string, overrides: string[] = []): StateRecord => ({
  slug, name: slug.toUpperCase(), abbr: 'XX', target_keyword: slug, portals: [{ label: 'P', url: 'https://x.gov.in/', scope: 'both' }],
  check_steps: ['Step number one', 'Step number two', 'Step number three'],
  pay_steps: ['Step number one', 'Step number two', 'Step number three'],
  sms_app_methods: [], court_challan_process: 'C'.repeat(120), payment_methods: ['UPI'],
  contacts: [], quirks: [],
  faqs: [{ q: 'Question one?', a: 'A'.repeat(50) }, { q: 'Question two?', a: 'B'.repeat(50) }, { q: 'Question three?', a: 'C'.repeat(50) }],
  fine_overrides: Object.fromEntries(overrides.map((o) => [o, { amount_text: '₹1', source: 'https://x.gov.in/' }])),
  sources: ['https://x.gov.in/'], last_verified: '2026-08-01'
} as StateRecord);

const mkGuides = (n: number): GuideRef[] =>
  Array.from({ length: n }, (_, i) => ({ slug: `guide-${i}`, title: `Guide ${i}: A Real Title` }));

describe('rotatedGuides', () => {
  const guides = mkGuides(6);
  it('is deterministic for the same seed', () => {
    expect(rotatedGuides('delhi', guides)).toEqual(rotatedGuides('delhi', guides));
  });
  it('picks the requested count of distinct guides', () => {
    const picks = rotatedGuides('telangana', guides);
    expect(picks).toHaveLength(2);
    expect(new Set(picks.map((g) => g.slug)).size).toBe(2);
  });
  it('returns all guides when there are fewer than count', () => {
    expect(rotatedGuides('delhi', mkGuides(1))).toHaveLength(1);
  });
  it('spreads picks across seeds (not everyone gets the same pair)', () => {
    const seeds = ['delhi', 'telangana', 'maharashtra', 'karnataka', 'gujarat', 'haryana', 'rajasthan'];
    const firstPicks = new Set(seeds.map((s) => rotatedGuides(s, guides)[0].slug));
    expect(firstPicks.size).toBeGreaterThan(1);
  });
  it('covers every real guide across the real state slugs (link equity for all 6 guides)', () => {
    // Real repo data: every guide must receive at least one contextual link
    // from the state pages alone. If a data change breaks coverage, adjust
    // the hash/rotation in links.ts, not this test.
    const stateSlugs = readdirSync(join(process.cwd(), 'data', 'states'))
      .filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
    const guideSlugs = readdirSync(join(process.cwd(), 'src', 'content', 'guides'))
      .filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')).sort();
    const realGuides: GuideRef[] = guideSlugs.map((slug) => ({ slug, title: slug }));
    const linked = new Set(stateSlugs.flatMap((s) => rotatedGuides(s, realGuides).map((g) => g.slug)));
    for (const g of guideSlugs) expect(linked.has(g), `guide ${g} gets no state-page link`).toBe(true);
  });
});

describe('relatedForState', () => {
  it('prioritizes overridden offences, caps at 8, links the state fine list for override states', () => {
    const offences = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(mkOffence);
    const items = relatedForState(mkState('delhi', ['h', 'i']), offences, []);
    expect(items.length).toBeLessThanOrEqual(8);
    // A state with fine_overrides has a /fines/{state}/ list page — the
    // related links point there instead of the generic /fines/ hub.
    expect(items.some((l) => l.href === '/fines/delhi/' && l.label === 'Full DELHI fine list')).toBe(true);
    expect(items.some((l) => l.href === '/fines/')).toBe(false);
    expect(items[0].href).toBe('/fines/h/');
    expect(items[1].href).toBe('/fines/i/');
  });

  it('keeps the generic fines hub link for states without a fine-list page', () => {
    const items = relatedForState(mkState('telangana'), ['a', 'b'].map(mkOffence), []);
    expect(items.some((l) => l.href === '/fines/' && l.label === 'Full traffic fine list')).toBe(true);
    expect(items.some((l) => l.href === '/fines/telangana/')).toBe(false);
  });

  it('links the discount tracker, status decoder and calculator feature pages', () => {
    const items = relatedForState(mkState('delhi'), ['a', 'b'].map(mkOffence), mkGuides(6));
    expect(items.some((l) => l.href === '/challan-discount/' && l.label.includes('DELHI'))).toBe(true);
    expect(items.some((l) => l.href === '/challan-status/')).toBe(true);
    expect(items.some((l) => l.href === '/calculator/')).toBe(true);
  });

  it('caps at 8 with 2 rotated guides at the tail using their real titles', () => {
    const guides = mkGuides(6);
    const items = relatedForState(mkState('delhi', ['h']), ['a', 'b', 'c', 'h'].map(mkOffence), guides);
    expect(items.length).toBe(8);
    const guideItems = items.filter((l) => l.href.startsWith('/guide-'));
    expect(guideItems).toHaveLength(2);
    for (const gi of guideItems) {
      const g = guides.find((x) => `/${x.slug}/` === gi.href)!;
      expect(gi.label).toBe(g.title); // real title, not a de-hyphenated slug
    }
  });
});

describe('relatedForFineList', () => {
  it('links the state e-challan page, calculator, fines hub and compare matrix', () => {
    const items = relatedForFineList(mkState('karnataka', ['x']));
    expect(items.map((l) => l.href)).toEqual([
      '/karnataka-e-challan/', '/calculator/', '/fines/', '/compare/'
    ]);
    expect(items[0].label).toBe('KARNATAKA e-challan: check & pay');
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

  it('links the calculator and compare pages plus rotated guides, capped at 8', () => {
    const states = ['delhi', 'telangana', 'maharashtra', 'karnataka', 'gujarat'].map((s) => mkState(s));
    const items = relatedForOffence(mkOffence('overspeeding'), states, mkGuides(6));
    expect(items.length).toBe(8);
    expect(items.some((l) => l.href === '/compare/')).toBe(true);
    expect(items.some((l) => l.href === '/calculator/')).toBe(true);
    expect(items.filter((l) => l.href.startsWith('/guide-'))).toHaveLength(2);
  });
});
