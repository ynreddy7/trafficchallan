import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadStates } from '../src/lib/data';

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
