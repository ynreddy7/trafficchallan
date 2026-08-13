import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ChallanStatusSchema, StatusFileSchema } from '../src/lib/schemas';
import { loadStatusFile } from '../src/lib/data';
import { runGates, type GateInput } from '../src/lib/gate';
import type { StateRecord, OffenceRecord } from '../src/lib/schemas';

const validStatus = {
  slug: 'pending',
  term: 'Pending',
  seen_on: ['echallan.parivahan.gov.in — Check Challan Status results table'],
  meaning: 'M'.repeat(80),
  next_steps: ['Pay online via the official portal if you accept the challan.'],
  sources: ['https://echallan.parivahan.gov.in/index/accused-challan']
};

const validFile = {
  statuses: [validStatus],
  vcourts: {
    states_count: 1,
    departments_count: 2,
    covered_states: ['Delhi (Notice Department + Traffic Department)'],
    footnotes: ['Delhi has a distinct Notice Department in addition to its Traffic Department.'],
    source: 'https://vcourts.gov.in/virtualcourt/index.php'
  },
  sources: ['https://echallan.parivahan.gov.in/index/accused-challan'],
  last_verified: '2026-08-13'
};

describe('ChallanStatusSchema', () => {
  it('accepts a valid record', () => {
    expect(ChallanStatusSchema.parse(validStatus).slug).toBe('pending');
  });
  it('rejects a meaning under 60 characters', () => {
    expect(() => ChallanStatusSchema.parse({ ...validStatus, meaning: 'Too short.' })).toThrow();
  });
  it('rejects empty next_steps', () => {
    expect(() => ChallanStatusSchema.parse({ ...validStatus, next_steps: [] })).toThrow();
  });
  it('rejects a next step under 10 characters', () => {
    expect(() => ChallanStatusSchema.parse({ ...validStatus, next_steps: ['Pay now.'] })).toThrow();
  });
  it('rejects a non-url source', () => {
    expect(() => ChallanStatusSchema.parse({ ...validStatus, sources: ['not a url'] })).toThrow();
  });
});

describe('StatusFileSchema', () => {
  it('accepts a valid file', () => {
    expect(StatusFileSchema.parse(validFile).statuses).toHaveLength(1);
  });
  it('rejects duplicate status slugs', () => {
    const bad = { ...validFile, statuses: [validStatus, { ...validStatus, term: 'Pending again' }] };
    expect(() => StatusFileSchema.parse(bad)).toThrow(/duplicate status slug/);
  });
  it('rejects a states_count that disagrees with covered_states', () => {
    const bad = { ...validFile, vcourts: { ...validFile.vcourts, states_count: 5 } };
    expect(() => StatusFileSchema.parse(bad)).toThrow(/states_count/);
  });
  it('rejects a departments_count that disagrees with the covered_states department lists', () => {
    const bad = { ...validFile, vcourts: { ...validFile.vcourts, departments_count: 3 } };
    expect(() => StatusFileSchema.parse(bad)).toThrow(/departments_count 3 does not match the 2 departments/);
  });
  it('counts a covered_states entry without a parenthesised list as one department', () => {
    const ok = {
      ...validFile,
      vcourts: {
        ...validFile.vcourts,
        states_count: 2,
        departments_count: 3,
        covered_states: ['Delhi (Notice Department + Traffic Department)', 'Haryana']
      }
    };
    expect(StatusFileSchema.parse(ok).vcourts.departments_count).toBe(3);
  });
  it('rejects a missing vcourts block', () => {
    const { vcourts: _vcourts, ...bad } = validFile;
    expect(() => StatusFileSchema.parse(bad)).toThrow();
  });
});

describe('loadStatusFile', () => {
  it('loads the real seeded data file', () => {
    const file = loadStatusFile();
    expect(file.statuses.length).toBeGreaterThanOrEqual(8);
    expect(file.vcourts.states_count).toBe(22);
    expect(file.vcourts.departments_count).toBe(31);
  });
  it('throws an error naming the file for invalid data', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tc-status-'));
    const path = join(dir, 'challan-statuses.json');
    writeFileSync(path, JSON.stringify({ statuses: [] }));
    expect(() => loadStatusFile(path)).toThrow(/challan-statuses\.json/);
  });
});

// ---- gate wiring ----

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

const gateBase: GateInput = {
  states: [gateState()], offences: [gateOffence()], guides: [], now: new Date('2026-08-13')
};

describe('runGates — challan-status rules', () => {
  it('passes a fresh status file with the challan-status page registered', () => {
    const v = runGates({
      ...gateBase,
      statusFile: StatusFileSchema.parse(validFile),
      pages: [{ slug: 'challan-status', target_keyword: 'e challan status meaning' }]
    });
    expect(v).toEqual([]);
  });
  it('flags a status file older than 90 days', () => {
    const v = runGates({
      ...gateBase,
      statusFile: StatusFileSchema.parse({ ...validFile, last_verified: '2026-01-01' })
    });
    expect(v.join(' ')).toMatch(/challan-statuses: stale/);
  });
  it('flags the challan-status page keyword when a guide duplicates it', () => {
    const v = runGates({
      ...gateBase,
      guides: [{ file: 'status-guide.md', target_keyword: 'e challan status meaning', last_verified: '2026-08-01', sources: ['https://example.gov.in/'] }],
      pages: [{ slug: 'challan-status', target_keyword: 'e challan status meaning' }]
    });
    expect(v.join(' ')).toMatch(/duplicate target_keyword "e challan status meaning"/);
  });
});

// ---- assertions on the real seeded data ----

describe('seeded challan-statuses data', () => {
  const file = loadStatusFile();

  it('every status slug is unique', () => {
    const slugs = file.statuses.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it('every status has non-empty next_steps', () => {
    for (const s of file.statuses) {
      expect(s.next_steps.length).toBeGreaterThan(0);
      for (const step of s.next_steps) expect(step.trim().length).toBeGreaterThan(0);
    }
  });
  it('every status carries at least one source', () => {
    for (const s of file.statuses) expect(s.sources.length).toBeGreaterThan(0);
  });
  it('passes the gate as of today alongside the feature-page registry entry', () => {
    const v = runGates({
      states: [], offences: [], guides: [],
      statusFile: file,
      pages: [{ slug: 'challan-status', target_keyword: 'e challan status meaning' }],
      now: new Date()
    });
    expect(v).toEqual([]);
  });
});
