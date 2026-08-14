import { describe, it, expect } from 'vitest';
import {
  rtoStateHref, rtoCodeHref, rtoHubTitle, rtoDisclosure, rtoSourceLabels, rtoHubRelated
} from '../src/lib/rto-hub';
import { loadRtoFiles, loadStates } from '../src/lib/data';
import { hasFineListPage } from '../src/lib/fine-list';
import { runGates, type GateInput } from '../src/lib/gate';
import type { StateRecord } from '../src/lib/schemas';

const rtoFiles = loadRtoFiles();

describe('hub routes', () => {
  it('generates a hub path for all 36 states and union territories', () => {
    expect(rtoFiles.length).toBe(36);
    const paths = rtoFiles.map((r) => rtoStateHref(r.slug));
    expect(new Set(paths).size).toBe(36);
    for (const p of paths) expect(p).toMatch(/^\/rto-codes\/[a-z][a-z-]*\/$/);
  });
});

describe('rtoStateHref / rtoCodeHref (island link targets)', () => {
  it('links a state result to its hub page', () => {
    expect(rtoStateHref('maharashtra')).toBe('/rto-codes/maharashtra/');
  });
  it('links a code hit to its lowercased row anchor on the hub', () => {
    expect(rtoCodeHref('maharashtra', 'MH12')).toBe('/rto-codes/maharashtra/#mh12');
    expect(rtoCodeHref('telangana', 'TS09')).toBe('/rto-codes/telangana/#ts09');
  });
});

describe('rtoHubTitle', () => {
  it('uses the full query-language pattern when it fits', () => {
    expect(rtoHubTitle('Maharashtra', ['MH'], 60)).toBe('Maharashtra RTO Code List (MH): All 60 Codes & Offices');
    expect(rtoHubTitle('Telangana', ['TS', 'TG'], 76)).toBe('Telangana RTO Code List (TS, TG): All 76 Codes & Offices');
  });
  it('falls back to the short pattern for long names', () => {
    expect(rtoHubTitle('Andaman and Nicobar Islands', ['AN'], 1)).toBe('Andaman and Nicobar Islands RTO Codes (AN)');
    expect(rtoHubTitle('Dadra and Nagar Haveli and Daman and Diu', ['DD', 'DN'], 4)).toBe(
      'Dadra and Nagar Haveli and Daman and Diu RTO Codes (DD, DN)'
    );
  });
  it('never emits "All 1 Codes" for a single-code state', () => {
    expect(rtoHubTitle('Ladakh', ['LA'], 1)).toBe('Ladakh RTO Codes (LA)');
  });
  it('stays inside the 62-character SERP budget for every real state', () => {
    for (const r of rtoFiles) {
      const t = rtoHubTitle(r.state_name, r.series, r.codes.length);
      expect(t.length, `${r.slug}: "${t}"`).toBeLessThanOrEqual(62);
      expect(t).toContain(r.state_name);
    }
  });
});

describe('rtoDisclosure', () => {
  const rec = (over: object) => ({
    codes: [{ code: 'XX01', office: 'Office One' }, { code: 'XX02', office: 'Office Two' }],
    verification: { method: 'sampled' as const, sample_size: 1, official_list_available: true },
    sources: ['https://a.gov.in/', 'https://b.example.com/'],
    ...over
  });
  it('states full verification against the official list', () => {
    expect(rtoDisclosure(rec({ verification: { method: 'full', official_list_available: true } })))
      .toBe('All 2 codes verified against the official state transport department list.');
  });
  it('discloses the sample when checked against an official list', () => {
    expect(rtoDisclosure(rec({}))).toBe(
      'Sample-verified: 1 of 2 codes checked against the official transport department list and independent directories.'
    );
  });
  it('discloses the source count when no official list is fetchable', () => {
    expect(rtoDisclosure(rec({ verification: { method: 'sampled', sample_size: 2, official_list_available: false } })))
      .toBe('Sample-verified: 2 of 2 codes checked against 2 independent sources — no fetchable official list.');
  });
});

describe('rtoSourceLabels', () => {
  it('labels repeated hostnames with a counter so every URL stays visible', () => {
    const labels = rtoSourceLabels([
      'https://transport.example.gov.in/list',
      'https://transport.example.gov.in/pdf',
      'https://www.other.gov.in/'
    ]);
    expect(labels.map((l) => l.label)).toEqual([
      'transport.example.gov.in',
      'transport.example.gov.in (2)',
      'other.gov.in'
    ]);
  });
});

describe('rtoHubRelated', () => {
  const rec = { slug: 'maharashtra', state_name: 'Maharashtra' };
  it('links e-challan and fine-list pages when they exist, plus the index', () => {
    const items = rtoHubRelated(rec, new Set(['maharashtra']), new Set(['maharashtra']));
    expect(items.map((i) => i.href)).toEqual([
      '/maharashtra-e-challan/',
      '/fines/maharashtra/',
      '/rto-codes/'
    ]);
  });
  it('links only the index for a state without site pages', () => {
    const items = rtoHubRelated({ slug: 'ladakh', state_name: 'Ladakh' }, new Set(), new Set());
    expect(items.map((i) => i.href)).toEqual(['/rto-codes/']);
  });
  it('only ever offers links to pages that really build (real data)', () => {
    const states = loadStates();
    const siteSlugs = new Set(states.map((s) => s.slug));
    const fineSlugs = new Set(states.filter(hasFineListPage).map((s) => s.slug));
    for (const r of rtoFiles) {
      for (const item of rtoHubRelated(r, siteSlugs, fineSlugs)) {
        if (item.href.endsWith('-e-challan/')) expect(siteSlugs.has(r.slug)).toBe(true);
        if (item.href.startsWith('/fines/')) expect(fineSlugs.has(r.slug)).toBe(true);
      }
    }
  });
});

describe('page registry path-scoping', () => {
  const state = (over: Partial<StateRecord>): StateRecord => ({
    slug: 'maharashtra', name: 'Maharashtra', target_keyword: 'maharashtra e challan',
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

  it('an rto-codes/{state} page slug does not collide with the state or fine-list namespaces', () => {
    // "maharashtra" exists as /maharashtra-e-challan/ (state), /fines/maharashtra/
    // (fine list) AND /rto-codes/maharashtra/ (RTO hub) — three path namespaces,
    // three registry keys, zero collisions.
    const input: GateInput = {
      states: [state({
        fine_overrides: { 'no-helmet': { amount_text: '₹1', source: 'https://x.gov.in/' } }
      })],
      offences: [{
        slug: 'no-helmet', name: 'No helmet', target_keyword: 'helmet fine',
        mva_section: 'Section 194D', description: 'D'.repeat(100),
        base_fine_text: '₹1,000', base_fine_min: 1000, base_fine_max: 1000,
        repeat_fine_text: '₹1,000', licence_impact: 'None', compoundable_online: true,
        faqs: [{ q: 'Question one?', a: 'A'.repeat(50) }, { q: 'Question two?', a: 'B'.repeat(50) }],
        sources: ['https://example.gov.in/'], last_verified: '2026-08-01'
      }],
      guides: [],
      pages: [{ slug: 'rto-codes/maharashtra', target_keyword: 'maharashtra rto code list' }],
      now: new Date('2026-08-14')
    };
    expect(runGates(input)).toEqual([]);
  });

  it('the real registry entries are unique across all 36 hubs', () => {
    const slugs = rtoFiles.map((r) => `rto-codes/${r.slug}`);
    const keywords = rtoFiles.map((r) => `${r.state_name.toLowerCase()} rto code list`);
    expect(new Set(slugs).size).toBe(36);
    expect(new Set(keywords).size).toBe(36);
    // The index page's own registry entry stays distinct from every hub.
    expect(slugs).not.toContain('rto-codes');
    expect(keywords).not.toContain('rto code list india');
  });
});
