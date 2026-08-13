import { describe, it, expect } from 'vitest';
import { nextSitting, daysUntil } from '../src/lib/countdown';

const SITTINGS_2026 = ['2026-03-14', '2026-05-09', '2026-09-12', '2026-12-12'];

describe('nextSitting', () => {
  it('returns the earliest sitting on or after today', () => {
    expect(nextSitting(SITTINGS_2026, '2026-08-13')).toBe('2026-09-12');
  });

  it('returns today itself when today is a sitting day', () => {
    expect(nextSitting(SITTINGS_2026, '2026-09-12')).toBe('2026-09-12');
  });

  it('skips past sittings', () => {
    expect(nextSitting(SITTINGS_2026, '2026-05-10')).toBe('2026-09-12');
  });

  it('returns null when every sitting is past', () => {
    expect(nextSitting(SITTINGS_2026, '2026-12-13')).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(nextSitting([], '2026-08-13')).toBeNull();
  });

  it('handles unsorted input', () => {
    const shuffled = ['2026-12-12', '2026-03-14', '2026-09-12', '2026-05-09'];
    expect(nextSitting(shuffled, '2026-04-01')).toBe('2026-05-09');
  });

  it('handles a year boundary', () => {
    expect(nextSitting(['2026-12-12', '2027-03-13'], '2026-12-31')).toBe('2027-03-13');
  });
});

describe('daysUntil', () => {
  it('is 0 when the date is today', () => {
    expect(daysUntil('2026-09-12', '2026-09-12')).toBe(0);
  });

  it('counts forward days', () => {
    expect(daysUntil('2026-09-12', '2026-08-13')).toBe(30);
  });

  it('is negative for past dates', () => {
    expect(daysUntil('2026-05-09', '2026-08-13')).toBe(-96);
  });

  it('crosses a month boundary correctly', () => {
    expect(daysUntil('2026-09-01', '2026-08-31')).toBe(1);
  });

  it('crosses a year boundary correctly', () => {
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('handles a leap-year February (2028)', () => {
    expect(daysUntil('2028-03-01', '2028-02-28')).toBe(2);
  });
});
