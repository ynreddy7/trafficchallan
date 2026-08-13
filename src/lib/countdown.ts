// Pure date-string arithmetic for the Lok Adalat countdown.
// All inputs are ISO `YYYY-MM-DD` strings; comparisons are lexicographic
// (valid for this format) and day-difference math is done at UTC midnight so
// no timezone or DST can shift the count.

const utcMidnight = (iso: string): number => Date.parse(iso + 'T00:00:00Z');

/** Whole days from `todayISO` to `dateISO` (negative if the date is past). */
export function daysUntil(dateISO: string, todayISO: string): number {
  return Math.round((utcMidnight(dateISO) - utcMidnight(todayISO)) / 86_400_000);
}

/**
 * Earliest sitting on or after today, or null when every sitting is past.
 * Input need not be sorted.
 */
export function nextSitting(sittings: string[], todayISO: string): string | null {
  let best: string | null = null;
  for (const s of sittings) {
    if (s >= todayISO && (best === null || s < best)) best = s;
  }
  return best;
}
