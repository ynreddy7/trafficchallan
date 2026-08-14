import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OfficialDomainSchema, OfficialPortalsSchema } from '../src/lib/schemas';
import { loadOfficialPortals, loadStates } from '../src/lib/data';
import { runGates, type GateInput } from '../src/lib/gate';
import type { StateRecord, OffenceRecord } from '../src/lib/schemas';

const validDomain = {
  domain: 'echallan.parivahan.gov.in',
  label: 'MoRTH eChallan national portal'
};

const validFile = {
  national: [validDomain],
  states: [{
    state_slug: 'delhi',
    domains: [{ domain: 'traffic.delhipolice.gov.in', label: 'Delhi Traffic Police Notice Branch' }]
  }],
  sender_id_notes: [{
    fact: 'Registered SMS headers appear as XY-HEADER under the TRAI DLT regime, prefixed by operator and circle.',
    hedged: false
  }],
  scam_signals: [{
    slug: 'apk-attachment',
    name: 'Challan arrives as an APK file',
    detail: 'D'.repeat(80),
    source: 'https://echallan.parivahan.gov.in/'
  }],
  victim_help: [{
    fact: 'Call 1930, the national cyber crime helpline, as soon as you realise money has moved from your account.'
  }],
  sources: ['https://echallan.parivahan.gov.in/'],
  last_verified: '2026-08-13'
};

describe('OfficialDomainSchema', () => {
  it('accepts a bare hostname', () => {
    expect(OfficialDomainSchema.parse(validDomain).domain).toBe('echallan.parivahan.gov.in');
  });
  it('rejects a URL instead of a hostname', () => {
    expect(() => OfficialDomainSchema.parse({ ...validDomain, domain: 'https://echallan.parivahan.gov.in/' })).toThrow();
  });
  it('rejects a too-short caution note', () => {
    expect(() => OfficialDomainSchema.parse({ ...validDomain, note: 'careful' })).toThrow();
  });
});

describe('OfficialPortalsSchema', () => {
  it('accepts a valid file', () => {
    expect(OfficialPortalsSchema.parse(validFile).national).toHaveLength(1);
  });
  it('rejects duplicate national domains', () => {
    const bad = { ...validFile, national: [validDomain, { ...validDomain, label: 'Same domain again' }] };
    expect(() => OfficialPortalsSchema.parse(bad)).toThrow(/duplicate national domain/);
  });
  it('rejects duplicate state_slugs', () => {
    const bad = { ...validFile, states: [validFile.states[0], validFile.states[0]] };
    expect(() => OfficialPortalsSchema.parse(bad)).toThrow(/duplicate state_slug/);
  });
  it('rejects duplicate scam-signal slugs', () => {
    const bad = { ...validFile, scam_signals: [validFile.scam_signals[0], { ...validFile.scam_signals[0], name: 'Again but different' }] };
    expect(() => OfficialPortalsSchema.parse(bad)).toThrow(/duplicate scam signal slug/);
  });
  it('rejects a non-url scam-signal source', () => {
    const bad = { ...validFile, scam_signals: [{ ...validFile.scam_signals[0], source: 'not a url' }] };
    expect(() => OfficialPortalsSchema.parse(bad)).toThrow();
  });
  it('rejects an empty states array', () => {
    expect(() => OfficialPortalsSchema.parse({ ...validFile, states: [] })).toThrow();
  });
  it('accepts a file with no official_app block at all', () => {
    expect(OfficialPortalsSchema.parse(validFile).official_app).toBeUndefined();
  });
});

describe('official_app block', () => {
  const app = {
    name: 'mParivahan',
    fact: 'F'.repeat(90),
    site: 'mparivahan.parivahan.gov.in',
    play_package: 'com.nic.mparivahan',
    source: 'https://parivahan.gov.in/',
    verified_on: '2026-08-14'
  };
  const withApp = (over: Record<string, unknown> = {}) => ({ ...validFile, official_app: { ...app, ...over } });

  it('accepts a well-formed block', () => {
    expect(OfficialPortalsSchema.parse(withApp()).official_app?.play_package).toBe('com.nic.mparivahan');
  });
  it('rejects an app site that is not on a government domain', () => {
    expect(() => OfficialPortalsSchema.parse(withApp({ site: 'mparivahan.example.com' }))).toThrow(/gov\.in/);
  });
  it('rejects a store URL where a package name belongs', () => {
    expect(() => OfficialPortalsSchema.parse(withApp({ play_package: 'https://play.google.com/x' }))).toThrow(/package name/);
  });
  it('rejects a missing verification date', () => {
    const { verified_on, ...rest } = app;
    expect(() => OfficialPortalsSchema.parse({ ...validFile, official_app: rest })).toThrow();
  });
});

describe('loadOfficialPortals', () => {
  it('loads the real seeded data file', () => {
    const file = loadOfficialPortals();
    expect(file.national.length).toBeGreaterThanOrEqual(8);
    expect(file.states.length).toBe(13);
    expect(file.scam_signals.length).toBeGreaterThanOrEqual(6);
    expect(file.victim_help.length).toBeGreaterThanOrEqual(4);
  });
  it('throws an error naming the file for invalid data', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tc-portals-'));
    const path = join(dir, 'official-portals.json');
    writeFileSync(path, JSON.stringify({ national: [] }));
    expect(() => loadOfficialPortals(path)).toThrow(/official-portals\.json/);
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

describe('runGates — official-portals rules', () => {
  it('passes a fresh portals file with the fake-challan-sms page registered', () => {
    const v = runGates({
      ...gateBase,
      portalsFile: OfficialPortalsSchema.parse(validFile),
      pages: [{ slug: 'fake-challan-sms', target_keyword: 'e challan fake sms' }]
    });
    expect(v).toEqual([]);
  });
  it('flags a portals file older than 90 days', () => {
    const v = runGates({
      ...gateBase,
      portalsFile: OfficialPortalsSchema.parse({ ...validFile, last_verified: '2026-01-01' })
    });
    expect(v.join(' ')).toMatch(/official-portals: stale/);
  });
  it('flags the fake-challan-sms page keyword when a guide duplicates it', () => {
    const v = runGates({
      ...gateBase,
      guides: [{ file: 'fake-sms-guide.md', target_keyword: 'e challan fake sms', last_verified: '2026-08-01', sources: ['https://example.gov.in/'] }],
      pages: [{ slug: 'fake-challan-sms', target_keyword: 'e challan fake sms' }]
    });
    expect(v.join(' ')).toMatch(/duplicate target_keyword "e challan fake sms"/);
  });
});

// ---- assertions on the real seeded data ----

describe('seeded official-portals data', () => {
  const file = loadOfficialPortals();

  it('every state_slug matches a real data/states slug', () => {
    const stateSlugs = new Set(loadStates().map((s) => s.slug));
    for (const s of file.states) {
      expect(stateSlugs.has(s.state_slug), `state_slug "${s.state_slug}" has no data/states record`).toBe(true);
    }
  });
  it('every non-gov.in/nic.in domain carries a caution note', () => {
    const official = (d: string) => d.endsWith('.gov.in') || d.endsWith('.nic.in');
    for (const d of [...file.national, ...file.states.flatMap((s) => s.domains)]) {
      if (!official(d.domain)) {
        expect(d.note, `non-gov domain "${d.domain}" must carry a caution note`).toBeTruthy();
      }
    }
  });
  it('every hedged-prone claim is marked: at least one sender note is hedged', () => {
    expect(file.sender_id_notes.some((n) => n.hedged)).toBe(true);
  });
  it('has the APK signal and at least one genuine- inverse signal', () => {
    const slugs = file.scam_signals.map((s) => s.slug);
    expect(slugs).toContain('apk-attachment');
    expect(slugs.some((s) => s.startsWith('genuine-'))).toBe(true);
  });
  it('every scam signal source appears reachable-shaped (https URL)', () => {
    for (const s of file.scam_signals) expect(s.source.startsWith('https://')).toBe(true);
  });
  it('the official_app fact is sourced, and its source is listed in the file sources', () => {
    const app = file.official_app;
    expect(app).toBeTruthy();
    expect(file.sources).toContain(app!.source);
  });
  it('the official_app carries its own verification date, never older than the row it documents', () => {
    // It is dated INDEPENDENTLY of the file: a fact verified after the last
    // full sweep must not silently inherit — or bump — the file-level date.
    const app = file.official_app!;
    expect(app.verified_on >= file.last_verified).toBe(true);
  });
  it('passes the gate as of today alongside the feature-page registry entry', () => {
    const v = runGates({
      states: [], offences: [], guides: [],
      portalsFile: file,
      pages: [{ slug: 'fake-challan-sms', target_keyword: 'e challan fake sms' }],
      now: new Date()
    });
    expect(v).toEqual([]);
  });
});
