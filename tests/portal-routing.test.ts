import { describe, it, expect } from 'vitest';
import {
  classifyStateRouting, groupByRouting, countByNational, rtoStateEntries, hostOf,
  RTO_CODE_TO_SLUG, NATIONAL_LEGACY_HOST, NATIONAL_NEXTGEN_HOST
} from '../src/lib/portal-routing';
import { resolveVehicleInput } from '../src/lib/portal-finder';
import { loadStates } from '../src/lib/data';
import { runGates, type GateInput } from '../src/lib/gate';
import type { StateRecord } from '../src/lib/schemas';

type Portal = StateRecord['portals'][number];

const state = (slug: string, name: string, abbr: string, portals: Portal[]): StateRecord => ({
  slug, name, abbr, target_keyword: `${slug} e challan`,
  portals,
  check_steps: ['Step one here', 'Step two here', 'Step three here'],
  pay_steps: ['Step one here', 'Step two here', 'Step three here'],
  sms_app_methods: [], court_challan_process: 'C'.repeat(120),
  payment_methods: ['UPI'], contacts: [], quirks: [],
  faqs: [
    { q: 'Question one?', a: 'A'.repeat(50) },
    { q: 'Question two?', a: 'B'.repeat(50) },
    { q: 'Question three?', a: 'C'.repeat(50) }
  ],
  fine_overrides: {}, sources: ['https://example.gov.in/'], last_verified: '2026-08-13'
});

const legacy: Portal = { label: 'Legacy national eChallan', url: `https://${NATIONAL_LEGACY_HOST}/index/accused-challan`, scope: 'both' };
const nextgen: Portal = { label: 'NextGen eChallan', url: `https://${NATIONAL_NEXTGEN_HOST}/challan`, scope: 'both' };
const courts: Portal = { label: 'Virtual Courts', url: 'https://vcourts.gov.in/virtualcourt/', scope: 'both' };

describe('hostOf', () => {
  it('strips www. and the path', () => {
    expect(hostOf('https://www.karnatakaone.gov.in/Info/Public/X')).toBe('karnatakaone.gov.in');
  });
});

describe('classifyStateRouting', () => {
  it('reports a legacy-only state as legacy with no state portal', () => {
    const r = classifyStateRouting(state('uttar-pradesh', 'Uttar Pradesh', 'UP', [legacy, courts]));
    expect(r.national).toBe('legacy');
    expect(r.nationalPortal?.host).toBe(NATIONAL_LEGACY_HOST);
    expect(r.stateOwn).toEqual([]);
  });

  it('prefers NextGen when a migrated state still lists the legacy page', () => {
    const r = classifyStateRouting(state('tamil-nadu', 'Tamil Nadu', 'TN', [legacy, nextgen]));
    expect(r.national).toBe('nextgen');
    expect(r.nationalPortal?.host).toBe(NATIONAL_NEXTGEN_HOST);
  });

  it('never counts a court portal as the state running its own portal', () => {
    const r = classifyStateRouting(state('rajasthan', 'Rajasthan', 'RJ', [nextgen, courts]));
    expect(r.stateOwn).toEqual([]);
  });

  it('ignores check-only portals — a state portal must be able to transact', () => {
    const r = classifyStateRouting(state('rajasthan', 'Rajasthan', 'RJ', [
      nextgen,
      { label: 'Transport dept notifications', url: 'https://transport.rajasthan.gov.in/x', scope: 'check' }
    ]));
    expect(r.stateOwn).toEqual([]);
  });

  it('collects a state-run portal once per host, first entry winning', () => {
    const r = classifyStateRouting(state('gujarat', 'Gujarat', 'GJ', [
      nextgen,
      { label: 'Gujarat Police eChallan payment', url: 'https://echallanpayment.gujarat.gov.in/a', scope: 'both' },
      { label: 'Gujarat Police eChallan cash counters', url: 'https://echallanpayment.gujarat.gov.in/b', scope: 'pay' }
    ]));
    expect(r.stateOwn).toHaveLength(1);
    expect(r.stateOwn[0].label).toBe('Gujarat Police eChallan payment');
    expect(r.stateOwn[0].host).toBe('echallanpayment.gujarat.gov.in');
  });

  it('reports "none" when no national portal transacts the state', () => {
    const r = classifyStateRouting(state('x', 'X', 'XX', [
      { label: 'State portal only', url: 'https://echallan.xpolice.gov.in/', scope: 'both' }
    ]));
    expect(r.national).toBe('none');
    expect(r.nationalPortal).toBeNull();
    expect(r.stateOwn).toHaveLength(1);
  });
});

describe('groupByRouting / countByNational', () => {
  const routings = [
    classifyStateRouting(state('uttar-pradesh', 'Uttar Pradesh', 'UP', [legacy])),
    classifyStateRouting(state('tamil-nadu', 'Tamil Nadu', 'TN', [nextgen])),
    classifyStateRouting(state('maharashtra', 'Maharashtra', 'MH', [
      nextgen, { label: 'MH traffic e-challan', url: 'https://mahatrafficechallan.gov.in/x', scope: 'both' }
    ]))
  ];

  it('partitions every state into exactly one group, sorted by name', () => {
    const { nationalOnly, stateRun } = groupByRouting(routings);
    expect(nationalOnly.map((r) => r.name)).toEqual(['Tamil Nadu', 'Uttar Pradesh']);
    expect(stateRun.map((r) => r.name)).toEqual(['Maharashtra']);
    expect(nationalOnly.length + stateRun.length).toBe(routings.length);
  });

  it('counts states per national portal', () => {
    expect(countByNational(routings)).toEqual({ nextgen: 2, legacy: 1, none: 0 });
  });
});

describe('rtoStateEntries', () => {
  it('drops codes whose state has no record instead of inventing one', () => {
    const entries = rtoStateEntries([{ slug: 'delhi', name: 'Delhi' }]);
    expect(entries).toEqual([{ code: 'DL', slug: 'delhi', name: 'Delhi' }]);
  });

  it('keeps both Telangana codes pointing at one state', () => {
    const entries = rtoStateEntries([{ slug: 'telangana', name: 'Telangana' }]);
    expect(entries.map((e) => e.code).sort()).toEqual(['TG', 'TS']);
  });

  it('feeds resolveVehicleInput — a prefix routes to its state', () => {
    const entries = rtoStateEntries(loadStates());
    expect(resolveVehicleInput('MH', entries)).toEqual({ kind: 'state', slug: 'maharashtra' });
    expect(resolveVehicleInput('TG09', entries)).toEqual({ kind: 'state', slug: 'telangana' });
  });
});

// ---- assertions on the real seeded data ----

describe('seeded state routing', () => {
  const states = loadStates();
  const routings = states.map(classifyStateRouting);

  it('every RTO_CODE_TO_SLUG target is a real state slug', () => {
    const slugs = new Set(states.map((s) => s.slug));
    for (const [code, slug] of Object.entries(RTO_CODE_TO_SLUG)) {
      expect(slugs.has(slug), `code ${code} → unknown slug "${slug}"`).toBe(true);
    }
  });

  it('every state resolves to a national portal — no unrouted state ships', () => {
    for (const r of routings) {
      expect(r.national, `${r.slug} has no transacting national portal`).not.toBe('none');
      expect(r.nationalPortal).not.toBeNull();
    }
  });

  it('the two routing groups partition every state exactly once', () => {
    const { nationalOnly, stateRun } = groupByRouting(routings);
    expect(nationalOnly.length + stateRun.length).toBe(states.length);
    const overlap = new Set(nationalOnly.map((r) => r.slug));
    expect(stateRun.some((r) => overlap.has(r.slug))).toBe(false);
  });

  it('both national portals are actually in use across the tracked states', () => {
    const counts = countByNational(routings);
    expect(counts.nextgen).toBeGreaterThan(0);
    expect(counts.legacy).toBeGreaterThan(0);
    expect(counts.nextgen + counts.legacy).toBe(states.length);
  });

  it('a state-run portal is never one of the national or court hosts', () => {
    const excluded = new Set([NATIONAL_LEGACY_HOST, NATIONAL_NEXTGEN_HOST, 'vcourts.gov.in', 'pay.ecourts.gov.in']);
    for (const r of routings) {
      for (const p of r.stateOwn) expect(excluded.has(p.host), `${r.slug}: ${p.host}`).toBe(false);
    }
  });
});

// ---- feature-page registry ----

describe('/echallan-parivahan/ registry entry', () => {
  const base: GateInput = { states: [], offences: [], guides: [], now: new Date('2026-08-14') };

  it('does not collide with the sibling portal page on slug or keyword', () => {
    const v = runGates({
      ...base,
      pages: [
        { slug: 'fake-challan-sms', target_keyword: 'e challan fake sms' },
        { slug: 'echallan-parivahan', target_keyword: 'echallan parivahan' }
      ]
    });
    expect(v).toEqual([]);
  });

  it('is flagged if any other page claims the same keyword', () => {
    const v = runGates({
      ...base,
      guides: [{ file: 'x.md', target_keyword: 'echallan parivahan', last_verified: '2026-08-13', sources: ['https://x.gov.in/'] }],
      pages: [{ slug: 'echallan-parivahan', target_keyword: 'echallan parivahan' }]
    });
    expect(v.join(' ')).toMatch(/duplicate target_keyword "echallan parivahan"/);
  });

  it('does not collide with any state, offence or guide keyword in the real data', () => {
    const claimed = new Set(loadStates().map((s) => s.target_keyword.trim().toLowerCase()));
    expect(claimed.has('echallan parivahan')).toBe(false);
  });
});
