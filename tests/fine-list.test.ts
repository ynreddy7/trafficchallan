import { describe, it, expect } from 'vitest';
import { loadStates, loadOffences, fineListDate } from '../src/lib/data';
import { hasFineListPage, fineListRows } from '../src/lib/fine-list';

// The 11 states that carry verified fine_overrides today — the ONLY states
// that get a /fines/{state}/ list page. Telangana (never adopted the 2019 MV
// Amendment schedule), Madhya Pradesh and Jammu & Kashmir carry no verified
// state amounts and must never appear here.
const EXPECTED_LIST_STATES = [
  'andhra-pradesh', 'delhi', 'gujarat', 'haryana', 'karnataka',
  'maharashtra', 'odisha', 'rajasthan', 'tamil-nadu', 'uttar-pradesh', 'west-bengal'
];

describe('hasFineListPage (real repo data — mirrors getStaticPaths in src/pages/fines/[slug].astro)', () => {
  it('selects exactly the 11 verified-override states', () => {
    const slugs = loadStates().filter(hasFineListPage).map((s) => s.slug).sort();
    expect(slugs).toEqual(EXPECTED_LIST_STATES);
  });

  it('excludes every state without verified state amounts', () => {
    const slugs = new Set(loadStates().filter(hasFineListPage).map((s) => s.slug));
    for (const s of ['telangana', 'madhya-pradesh', 'jammu-kashmir']) {
      expect(slugs.has(s), `${s} must not get a fine-list page`).toBe(false);
    }
  });

  it('produces no slug collisions with offence pages (the two path sets union into one route)', () => {
    const offenceSlugs = new Set(loadOffences().map((o) => o.slug));
    for (const s of loadStates().filter(hasFineListPage)) {
      expect(offenceSlugs.has(s.slug), `state ${s.slug} collides with an offence slug`).toBe(false);
    }
  });
});

describe('fineListRows labeling (real state: karnataka)', () => {
  const karnataka = loadStates().find((s) => s.slug === 'karnataka')!;
  const offences = loadOffences();
  const rows = fineListRows(karnataka, offences);
  const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));

  it('renders one row per offence', () => {
    expect(rows).toHaveLength(offences.length);
    expect(rows.map((r) => r.slug).sort()).toEqual(offences.map((o) => o.slug).sort());
  });

  it('override rows carry the state amount_text and overridden=true', () => {
    const helmet = bySlug['driving-without-helmet'];
    expect(helmet.overridden).toBe(true);
    expect(helmet.amountText).toBe(karnataka.fine_overrides['driving-without-helmet'].amount_text);
  });

  it('non-override rows fall back to the statutory base_fine_text with overridden=false', () => {
    // drunk-driving is the one offence karnataka has no override for.
    const drunk = bySlug['drunk-driving'];
    const record = offences.find((o) => o.slug === 'drunk-driving')!;
    expect(drunk.overridden).toBe(false);
    expect(drunk.amountText).toBe(record.base_fine_text);
  });

  it('overridden row count equals the state record override count', () => {
    expect(rows.filter((r) => r.overridden)).toHaveLength(Object.keys(karnataka.fine_overrides).length);
  });
});

describe('fineListDate (the /fines/{state}/ dateModified — same rule as the buildLastmodMap entries in astro.config.mjs)', () => {
  it('is max(state last_verified, newest offence last_verified) for every list state', () => {
    const offences = loadOffences();
    for (const s of loadStates().filter(hasFineListPage)) {
      const expected = [s.last_verified, ...offences.map((o) => o.last_verified)].sort().at(-1);
      expect(fineListDate(s, offences)).toBe(expected);
    }
  });

  it('is never older than either input (a lastmod entry exists and is coherent)', () => {
    const offences = loadOffences();
    for (const s of loadStates().filter(hasFineListPage)) {
      const d = fineListDate(s, offences);
      expect(d >= s.last_verified).toBe(true);
      for (const o of offences) expect(d >= o.last_verified).toBe(true);
    }
  });
});
