import { describe, it, expect } from 'vitest';
import { sourceKind, sourceKindLabel, bestSource } from '../src/lib/sources';

describe('sourceKind', () => {
  it('treats Indian government domains as official', () => {
    expect(sourceKind('https://dslsa.org/x')).toBe('press'); // .org is NOT government
    expect(sourceKind('https://nalsa.gov.in/national-lok-adalat/')).toBe('official');
    expect(sourceKind('https://karnataka.nalsa.gov.in/notifications/')).toBe('official');
    expect(sourceKind('https://delhidistrictcourts.nic.in/circulars')).toBe('official');
    expect(sourceKind('https://cdnbbsr.s3waas.gov.in/s3abc/uploads/2026/08/x.pdf')).toBe('official');
  });

  it('keeps court records distinct from the issuing department', () => {
    // A High Court order reproducing a notification proves it exists, but it is
    // not the department's own record — Bihar is evidenced only this way.
    expect(sourceKind('https://indiankanoon.org/doc/175588204/')).toBe('court');
  });

  it('classifies everything else as press', () => {
    expect(sourceKind('https://bharatspeaks.com/delhi-amnesty/')).toBe('press');
    expect(sourceKind('https://the420.in/delhi-challan/')).toBe('press');
    expect(sourceKind('https://www.livelaw.in/events/x')).toBe('press');
    expect(sourceKind('https://www.gktoday.in/bihar-scheme/')).toBe('press');
  });

  it('does not let a lookalike domain pass as official', () => {
    // Suffix matching must be anchored on a dot boundary.
    expect(sourceKind('https://notgov.in/x')).toBe('press');
    expect(sourceKind('https://evilgov.in.example.com/x')).toBe('press');
    expect(sourceKind('https://fakenic.in/x')).toBe('press');
  });

  it('treats an unparseable url as press rather than throwing', () => {
    expect(sourceKind('not a url')).toBe('press');
  });
});

describe('sourceKindLabel', () => {
  it('never returns an empty label', () => {
    for (const k of ['official', 'court', 'press'] as const) {
      expect(sourceKindLabel(k).length).toBeGreaterThan(0);
    }
  });

  it('says plainly that a press source is not an order', () => {
    expect(sourceKindLabel('press')).toMatch(/not an order/);
  });
});

describe('bestSource', () => {
  it('picks the strongest source regardless of array position', () => {
    // The bug this guards: a record could be made to look authoritative by
    // reordering its sources, because the page rendered sources[0] blindly.
    const r = bestSource([
      'https://bharatspeaks.com/x',
      'https://indiankanoon.org/doc/1/',
      'https://nalsa.gov.in/y'
    ]);
    expect(r).toEqual({ url: 'https://nalsa.gov.in/y', kind: 'official' });
  });

  it('falls back to a court record when no official source exists', () => {
    const r = bestSource(['https://www.gktoday.in/x', 'https://indiankanoon.org/doc/2/']);
    expect(r?.kind).toBe('court');
  });

  it('reports press honestly when that is all there is', () => {
    const r = bestSource(['https://the420.in/x', 'https://bharatspeaks.com/y']);
    expect(r).toEqual({ url: 'https://the420.in/x', kind: 'press' });
  });

  it('returns null for an empty list', () => {
    expect(bestSource([])).toBeNull();
  });
});
