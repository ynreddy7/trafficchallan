import type { StateRecord, OffenceRecord } from './schemas';

export interface FineResult { text: string; overridden: boolean; overrideSource?: string; sectionNote: string }

export function computeFine(offence: OffenceRecord, state: StateRecord | null, repeat: boolean): FineResult {
  const sectionNote = `${offence.mva_section}. ${offence.licence_impact}`;
  const override = state?.fine_overrides[offence.slug];
  if (override) {
    return { text: override.amount_text, overridden: true, overrideSource: override.source, sectionNote };
  }
  return { text: repeat ? offence.repeat_fine_text : offence.base_fine_text, overridden: false, sectionNote };
}

export interface TotalFinesResult { total: number | null; determinate: boolean }

/**
 * Parses the single leading ₹N,NNN figure from a fine result's text, or
 * returns null when the text is not a single determinate amount: it does
 * not lead with a rupee figure at all (court-decided, "First offence:
 * imprisonment..." wording), or the figure is immediately continued as a
 * range ("₹1,000-2,000", "₹1,000 to ₹2,000"). A trailing descriptive clause
 * after the figure — "₹500 (Delhi notified)", "₹1,000 fine and
 * disqualification..." — does not disqualify it; only an explicit range
 * marker right after the number does.
 */
function leadingAmount(text: string): number | null {
  const m = text.match(/^₹\s?([\d,]+)(?:\.\d+)?/);
  if (!m) return null;
  const rest = text.slice(m[0].length);
  const isRangeContinuation = /^\s*[-–—]\s*(?:₹\s?)?\d/.test(rest) || /^\s+to\s+(?:₹\s?)?\d/i.test(rest);
  if (isRangeContinuation) return null;
  return Number(m[1].replace(/,/g, ''));
}

/**
 * Totals a set of selected calculator results — ONLY when every one of them
 * resolves to a single determinate figure. If any line is a range or a
 * court-decided/non-numeric amount, `total` is null so the UI never renders
 * a fake sum; `determinate` says which case applies.
 */
export function totalFines(results: FineResult[]): TotalFinesResult {
  const amounts = results.map((r) => leadingAmount(r.text));
  if (amounts.some((a) => a === null)) return { total: null, determinate: false };
  const total = amounts.reduce((sum: number, a) => sum + (a as number), 0);
  return { total, determinate: true };
}
