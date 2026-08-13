import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SchemeSchema, LokAdalatSchema, RtoStateSchema, type SchemeRecord, type LokAdalatRecord, type RtoStateRecord } from '../src/lib/schemas';
import { loadSchemes, loadLokAdalat, loadRtoFiles, maxSchemeDate } from '../src/lib/data';
import { runGates, type GateInput } from '../src/lib/gate';
import type { StateRecord, OffenceRecord } from '../src/lib/schemas';

const validScheme = {
  slug: 'karnataka',
  state_name: 'Karnataka',
  status: 'closed',
  scheme_name: '50% concession drive',
  percent_by_class: { all_vehicles: '50% waived' },
  window: { start: '2026-06-21', end: '2026-07-10' },
  note: 'The June-July 2026 window has closed; no discount is available between drives.',
  history: [],
  sources: ['https://example.gov.in/'],
  last_verified: '2026-08-13'
};

const validLokAdalat = {
  national_sittings: [
    { date: '2026-05-09', status: 'held' },
    { date: '2026-09-12', status: 'scheduled' }
  ],
  delhi_token: {
    portal: 'https://traffic.delhipolice.gov.in/lokadalat/',
    opens_days_before: 5,
    daily_cap_note: '50,000 challans released per day, up to 2 lakh in total per edition.',
    limits_note: 'A maximum of 5 challans per vehicle in March 2026; limits are announced per edition.'
  },
  delhi_extras: {
    digital_lok_adalat_note: 'DSLSA launched a Digital Lok Adalat application on 14 February 2026.',
    evening_courts_url: 'https://traffic.delhipolice.gov.in/evecourtddc/',
    weekend_courts_note: 'Weekend courts run from 5 July 2026 at all district court complexes.'
  },
  state_notes: [],
  sources: ['https://nalsa.gov.in/national-lok-adalat/'],
  last_verified: '2026-08-13'
};

const validRto = {
  slug: 'karnataka',
  state_name: 'Karnataka',
  series: ['KA'],
  codes: [{ code: 'KA01', office: 'Bengaluru Central RTO' }],
  verification: { method: 'sampled', sample_size: 5, official_list_available: true },
  sources: ['https://transport.karnataka.gov.in/'],
  last_verified: '2026-08-13'
};

describe('SchemeSchema', () => {
  it('accepts a valid closed record with percentages and window', () => {
    expect(SchemeSchema.parse(validScheme).status).toBe('closed');
  });
  it('accepts a plain none record without optional fields', () => {
    const rec = {
      slug: 'gujarat', state_name: 'Gujarat', status: 'none',
      note: 'No scheme is in force in Gujarat; only Lok Adalat sittings give relief.',
      sources: ['https://example.gov.in/'], last_verified: '2026-08-13'
    };
    expect(SchemeSchema.parse(rec).history).toEqual([]);
  });
  it('rejects percent_by_class on a rumour record', () => {
    const bad = { ...validScheme, status: 'rumour', window: undefined };
    expect(() => SchemeSchema.parse(bad)).toThrow(/percent_by_class/);
  });
  it('rejects percent_by_class on a proposal record', () => {
    const bad = { ...validScheme, status: 'proposal', window: undefined };
    expect(() => SchemeSchema.parse(bad)).toThrow(/percent_by_class/);
  });
  it('rejects a live record without a window', () => {
    const bad = { ...validScheme, status: 'live', window: undefined };
    expect(() => SchemeSchema.parse(bad)).toThrow(/requires a window/);
  });
  it('rejects an announced record without a window', () => {
    const bad = { ...validScheme, status: 'announced', window: undefined };
    expect(() => SchemeSchema.parse(bad)).toThrow(/requires a window/);
  });
  it('rejects a window whose end is before its start', () => {
    const bad = { ...validScheme, window: { start: '2026-07-10', end: '2026-06-21' } };
    expect(() => SchemeSchema.parse(bad)).toThrow(/before start/);
  });
  it('rejects a note under 30 characters', () => {
    const bad = { ...validScheme, note: 'Too short.' };
    expect(() => SchemeSchema.parse(bad)).toThrow();
  });
  it('rejects a history entry without sources', () => {
    const bad = { ...validScheme, history: [{ period: 'Dec 2023', summary: 'A one-time settlement window ran here.', sources: [] }] };
    expect(() => SchemeSchema.parse(bad)).toThrow();
  });
});

describe('LokAdalatSchema', () => {
  it('accepts a valid record', () => {
    expect(LokAdalatSchema.parse(validLokAdalat).national_sittings).toHaveLength(2);
  });
  it('rejects empty national_sittings', () => {
    expect(() => LokAdalatSchema.parse({ ...validLokAdalat, national_sittings: [] })).toThrow();
  });
  it('rejects a bad sitting status', () => {
    const bad = { ...validLokAdalat, national_sittings: [{ date: '2026-09-12', status: 'maybe' }] };
    expect(() => LokAdalatSchema.parse(bad)).toThrow();
  });
});

describe('RtoStateSchema', () => {
  it('accepts a valid record', () => {
    expect(RtoStateSchema.parse(validRto).codes[0].code).toBe('KA01');
  });
  it('rejects a malformed code', () => {
    const bad = { ...validRto, codes: [{ code: 'KA-01', office: 'Bengaluru Central RTO' }] };
    expect(() => RtoStateSchema.parse(bad)).toThrow();
  });
  it('rejects a lowercase series', () => {
    expect(() => RtoStateSchema.parse({ ...validRto, series: ['ka'] })).toThrow();
  });
});

// ---- gate rules ----

const gateState = (): StateRecord => ({
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
  fine_overrides: {}, sources: ['https://example.gov.in/'], last_verified: '2026-08-01'
});

const gateOffence = (): OffenceRecord => ({
  slug: 'no-helmet', name: 'No helmet', target_keyword: 'helmet fine',
  mva_section: 'Section 194D', description: 'D'.repeat(100),
  base_fine_text: '₹1,000', base_fine_min: 1000, base_fine_max: 1000,
  repeat_fine_text: '₹1,000', licence_impact: 'None', compoundable_online: true,
  faqs: [{ q: 'Question one?', a: 'A'.repeat(50) }, { q: 'Question two?', a: 'B'.repeat(50) }],
  sources: ['https://example.gov.in/'], last_verified: '2026-08-01'
});

const scheme = (over: Partial<SchemeRecord>): SchemeRecord =>
  SchemeSchema.parse({ ...validScheme, ...over });

const gateBase: GateInput = {
  states: [gateState()], offences: [gateOffence()], guides: [], now: new Date('2026-08-12')
};

describe('runGates — discount hub rules', () => {
  it('passes with clean scheme, lok-adalat, rto and pages inputs', () => {
    const v = runGates({
      ...gateBase,
      schemes: [scheme({ last_verified: '2026-08-10' })],
      lokAdalat: LokAdalatSchema.parse(validLokAdalat),
      rtoFiles: [RtoStateSchema.parse(validRto)],
      pages: [{ slug: 'challan-discount', target_keyword: 'traffic challan discount' }]
    });
    expect(v).toEqual([]);
  });

  it('flags a live scheme whose last_verified is 15 days old', () => {
    const v = runGates({
      ...gateBase,
      schemes: [scheme({
        status: 'live',
        window: { start: '2026-06-21', end: '2026-12-31' },
        last_verified: '2026-07-28'
      })]
    });
    expect(v.join(' ')).toMatch(/status "live".*14 days/);
  });

  it('flags a rumour scheme whose last_verified is 15 days old', () => {
    const v = runGates({
      ...gateBase,
      schemes: [scheme({
        status: 'rumour', percent_by_class: undefined, window: undefined,
        last_verified: '2026-07-28'
      })]
    });
    expect(v.join(' ')).toMatch(/status "rumour".*14 days/);
  });

  it('does NOT apply the 14-day rule to closed or none schemes', () => {
    const v = runGates({
      ...gateBase,
      schemes: [
        scheme({ last_verified: '2026-07-28' }),
        scheme({
          slug: 'gujarat', state_name: 'Gujarat', status: 'none',
          scheme_name: undefined, percent_by_class: undefined, window: undefined,
          last_verified: '2026-07-28'
        })
      ]
    });
    expect(v).toEqual([]);
  });

  it('still applies the general 90-day staleness rule to schemes', () => {
    const v = runGates({ ...gateBase, schemes: [scheme({ last_verified: '2026-01-01' })] });
    expect(v.join(' ')).toMatch(/scheme karnataka: stale/);
  });

  it('flags a live scheme whose window has ended', () => {
    const v = runGates({
      ...gateBase,
      schemes: [scheme({
        status: 'live',
        window: { start: '2026-06-21', end: '2026-07-10' },
        last_verified: '2026-08-10'
      })]
    });
    expect(v.join(' ')).toMatch(/window ended.*closed/);
  });

  it('flags lok-adalat data with no future sitting', () => {
    const v = runGates({
      ...gateBase,
      lokAdalat: LokAdalatSchema.parse({
        ...validLokAdalat,
        national_sittings: [{ date: '2026-03-14', status: 'held' }, { date: '2026-05-09', status: 'held' }]
      })
    });
    expect(v.join(' ')).toMatch(/no national sitting/);
  });

  it('treats a sitting today as a future sitting', () => {
    const v = runGates({
      ...gateBase,
      now: new Date('2026-09-12T10:00:00Z'),
      states: [{ ...gateState(), last_verified: '2026-09-01' }],
      offences: [{ ...gateOffence(), last_verified: '2026-09-01' }],
      lokAdalat: LokAdalatSchema.parse({ ...validLokAdalat, last_verified: '2026-09-01' })
    });
    expect(v).toEqual([]);
  });

  it('flags an rto file older than 365 days', () => {
    const v = runGates({
      ...gateBase,
      rtoFiles: [RtoStateSchema.parse({ ...validRto, last_verified: '2025-08-01' })]
    });
    expect(v.join(' ')).toMatch(/rto karnataka: stale/);
  });

  it('flags a page whose keyword duplicates a state keyword', () => {
    const v = runGates({
      ...gateBase,
      pages: [{ slug: 'challan-discount', target_keyword: 'delhi e challan' }]
    });
    expect(v.join(' ')).toMatch(/duplicate target_keyword/);
  });

  it('flags a page whose slug duplicates a guide slug', () => {
    const v = runGates({
      ...gateBase,
      guides: [{ file: 'challan-discount.md', target_keyword: 'challan discount guide', last_verified: '2026-08-01', sources: ['https://example.gov.in/'] }],
      pages: [{ slug: 'challan-discount', target_keyword: 'traffic challan discount' }]
    });
    expect(v.join(' ')).toMatch(/duplicate slug "challan-discount"/);
  });
});

// ---- loaders on the real seed data ----

describe('loaders on the seeded repo data', () => {
  it('loadSchemes loads all 16 seeded states', () => {
    const schemes = loadSchemes();
    expect(schemes.length).toBe(16);
    const bySlug = new Map(schemes.map((s) => [s.slug, s]));
    expect(bySlug.get('bihar')?.status).toBe('live');
    expect(bySlug.get('karnataka')?.status).toBe('closed');
    expect(bySlug.get('kerala')?.status).toBe('closed');
    expect(bySlug.get('maharashtra')?.status).toBe('proposal');
    expect(bySlug.get('telangana')?.status).toBe('none');
  });
  it('no non-live/announced/closed scheme carries percentages (honesty rule)', () => {
    for (const s of loadSchemes()) {
      if (!['live', 'announced', 'closed'].includes(s.status)) {
        expect(s.percent_by_class).toBeUndefined();
      }
    }
  });
  it('loadLokAdalat parses the seeded file with all four 2026 sittings', () => {
    const la = loadLokAdalat();
    expect(la.national_sittings.map((s) => s.date)).toEqual(['2026-03-14', '2026-05-09', '2026-09-12', '2026-12-12']);
  });
  it('loadRtoFiles tolerates a missing rto dir and loads the real one', () => {
    expect(loadRtoFiles(join(tmpdir(), 'definitely-missing-rto-dir'))).toEqual([]);
    // The real dataset shipped with /rto-codes/: all 36 states/UTs.
    expect(loadRtoFiles().length).toBe(36);
  });
  it('maxSchemeDate covers every scheme and the lok-adalat date', () => {
    const max = maxSchemeDate();
    for (const s of loadSchemes()) expect(max >= s.last_verified).toBe(true);
    expect(max >= loadLokAdalat().last_verified).toBe(true);
  });
  it('the seeded data passes the gate rules as of today', () => {
    const v = runGates({
      states: [], offences: [], guides: [],
      schemes: loadSchemes(), lokAdalat: loadLokAdalat(), rtoFiles: loadRtoFiles(),
      pages: [{ slug: 'challan-discount', target_keyword: 'traffic challan discount' }],
      now: new Date()
    });
    expect(v).toEqual([]);
  });
  it('rejects a schemes dir containing a slug/filename mismatch', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tc-schemes-'));
    writeFileSync(join(dir, 'wrong.json'), JSON.stringify(validScheme));
    expect(() => loadSchemes(dir)).toThrow(/wrong\.json.*slug/);
  });
});
