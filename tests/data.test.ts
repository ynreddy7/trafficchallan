import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import { loadStates, loadOffences, newestVerifiedDate } from '../src/lib/data';

function tmpDataDir(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'tc-data-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), JSON.stringify(content));
  }
  return dir;
}

const goodState = {
  slug: 'delhi', name: 'Delhi', target_keyword: 'delhi e challan',
  portals: [{ label: 'Delhi Traffic Police', url: 'https://traffic.delhipolice.gov.in/', scope: 'both' }],
  check_steps: ['Open the portal site', 'Enter your vehicle number', 'View pending challans'],
  pay_steps: ['Open the portal site', 'Select the pending challan', 'Pay via card or UPI'],
  sms_app_methods: [], court_challan_process: 'C'.repeat(120),
  payment_methods: ['UPI'], contacts: [], quirks: [],
  faqs: [
    { q: 'How do I check it?', a: 'A'.repeat(50) },
    { q: 'How do I pay it?', a: 'B'.repeat(50) },
    { q: 'What if unpaid then?', a: 'C'.repeat(50) }
  ],
  fine_overrides: {}, sources: ['https://traffic.delhipolice.gov.in/'], last_verified: '2026-08-12'
};

describe('loadStates', () => {
  it('loads valid records sorted by slug', () => {
    const dir = tmpDataDir({ 'delhi.json': goodState });
    const states = loadStates(dir);
    expect(states).toHaveLength(1);
    expect(states[0].name).toBe('Delhi');
  });
  it('throws an aggregate error naming every bad file', () => {
    const dir = tmpDataDir({
      'delhi.json': goodState,
      'bad.json': { slug: 'bad' }
    });
    expect(() => loadStates(dir)).toThrow(/bad\.json/);
  });
  it('rejects filename/slug mismatch', () => {
    const dir = tmpDataDir({ 'notdelhi.json': goodState });
    expect(() => loadStates(dir)).toThrow(/notdelhi\.json.*slug/);
  });
});

describe('newestVerifiedDate', () => {
  // Runs against the real repo data (states, fines, guides) rather than a
  // fixture, so it doubles as a regression check that the function still
  // agrees with astro.config.mjs's buildLastmodMap(), which computes the
  // same max from the same three sources for the sitemap.
  it('is at least as new as every state, offence and guide last_verified date', () => {
    const newest = newestVerifiedDate();

    for (const s of loadStates()) expect(newest >= s.last_verified).toBe(true);
    for (const o of loadOffences()) expect(newest >= o.last_verified).toBe(true);

    const guidesDir = join(process.cwd(), 'src', 'content', 'guides');
    for (const file of readdirSync(guidesDir).filter((f) => f.endsWith('.md'))) {
      const { data } = matter(readFileSync(join(guidesDir, file), 'utf-8'));
      if (data.last_verified) expect(newest >= data.last_verified).toBe(true);
    }
  });

  it('matches the known max across states, offences and guides', () => {
    const guidesDir = join(process.cwd(), 'src', 'content', 'guides');
    const guideDates = readdirSync(guidesDir)
      .filter((f) => f.endsWith('.md'))
      .map((file) => matter(readFileSync(join(guidesDir, file), 'utf-8')).data.last_verified)
      .filter((d): d is string => Boolean(d));

    const expected = [
      ...loadStates().map((s) => s.last_verified),
      ...loadOffences().map((o) => o.last_verified),
      ...guideDates
    ].sort().at(-1);

    expect(newestVerifiedDate()).toBe(expected);
  });
});
