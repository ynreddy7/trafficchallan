import { describe, it, expect } from 'vitest';
import { mapKeywords, isCurated } from '../scripts/keyword-map';

const known = [
  { slug: 'delhi-e-challan', target_keyword: 'delhi e challan', type: 'state' },
  { slug: 'fines/driving-without-helmet', target_keyword: 'helmet challan fine', type: 'offence' }
];

describe('mapKeywords', () => {
  it('assigns state-name keywords to state pages', () => {
    const r = mapKeywords([{ keyword: 'e challan delhi check online', volume: 5000 }], known);
    expect(r.assigned['delhi-e-challan'][0].volume).toBe(5000);
  });
  it('assigns topic keywords to offence pages', () => {
    const r = mapKeywords([{ keyword: 'helmet fine in india', volume: 900 }], known);
    expect(r.assigned['fines/driving-without-helmet']).toHaveLength(1);
  });
  it('leaves unmatched keywords unassigned', () => {
    const r = mapKeywords([{ keyword: 'fancy number plate cost', volume: 700 }], known);
    expect(r.unassigned).toHaveLength(1);
  });
});

describe('isCurated', () => {
  it('is true only when _curated is exactly true', () => {
    expect(isCurated({ _curated: true })).toBe(true);
  });
  it('is false when _curated is false, missing, or the value is not an object', () => {
    expect(isCurated({ _curated: false })).toBe(false);
    expect(isCurated({})).toBe(false);
    expect(isCurated({ _curated: 'true' })).toBe(false);
    expect(isCurated(undefined)).toBe(false);
    expect(isCurated(null)).toBe(false);
    expect(isCurated([])).toBe(false);
  });
});
