/**
 * RTO-code / number-plate → registering-office resolver (/rto-codes/ island).
 * Pure and side-effect free: never touches the network, never sends the typed
 * value anywhere. Callers pass in the RTO dataset (one entry per state/UT,
 * from data/rto/*.json) shaped as {@link RtoLookupState}.
 *
 * Also home of the low-level plate-parsing helpers ({@link normalizePlate},
 * {@link plateSeries}) shared with portal-finder.ts — one definition of
 * "looks like a registration number" for the whole site.
 */

export interface RtoLookupState {
  slug: string;
  state_name: string;
  series: string[];
  codes: { code: string; office: string }[];
}

export type RtoLookupResult =
  | { kind: 'code'; code: string; office: string; state: { slug: string; state_name: string } }
  | { kind: 'state'; series: string; codes_count: number; state: { slug: string; state_name: string } }
  | { kind: 'bh' }
  | { kind: 'unknown' };

/**
 * Normalizes typed plate input: strips spaces, hyphens and dots ("MH-12",
 * "mh 12", "MH.12.AB.1234" all become "MH12…"), uppercases the rest.
 */
export function normalizePlate(input: string): string {
  return input.replace(/[\s\-.]/g, '').toUpperCase();
}

/**
 * The two-letter series prefix of an already-normalized plate string, or null
 * when the shape does not look like a code. "Looks like a code" = a bare
 * two-letter string ("TG"), or two letters immediately followed by a digit
 * ("MH12AB1234", "KL01"). This deliberately excludes an attempted state name
 * like "Kar" or "karnataka", where the third character is a letter.
 */
export function plateSeries(compact: string): string | null {
  if (!/^[A-Z]{2}/.test(compact)) return null;
  if (compact.length === 2 || /[0-9]/.test(compact[2])) return compact.slice(0, 2);
  return null;
}

/**
 * Resolves typed input against the RTO dataset. Accepts a bare series ("MH"),
 * a code in any punctuation ("MH12", "mh 12", "MH-12", single digits
 * zero-padded so "MH1" → MH01), or a full registration number
 * ("MH12AB1234"). BH-series plates ("22BH1234AA") carry no state code at all
 * — they get their own result kind rather than a bogus state match.
 */
export function lookupRto(input: string, states: RtoLookupState[]): RtoLookupResult {
  const compact = normalizePlate(input);
  if (!compact) return { kind: 'unknown' };

  // Bharat series: "YY BH #### XX" — year digits first, then BH. A bare "BH"
  // is the same ask ("what is a BH plate?"), so it routes here too.
  if (compact === 'BH' || /^[0-9]{2}BH/.test(compact)) return { kind: 'bh' };

  const series = plateSeries(compact);
  if (!series) return { kind: 'unknown' };

  const state = states.find((s) => s.series.includes(series));
  if (!state) return { kind: 'unknown' };

  // Code path: series + 1-2 digits ("MH12…", "MH1"). Dataset codes are all
  // zero-padded to two digits, so pad before looking up.
  const m = compact.match(/^[A-Z]{2}([0-9]{1,2})/);
  if (m) {
    const code = series + m[1].padStart(2, '0');
    const entry = state.codes.find((c) => c.code === code);
    if (entry) {
      return {
        kind: 'code',
        code,
        office: entry.office,
        state: { slug: state.slug, state_name: state.state_name }
      };
    }
    // Known series, unlisted number — fall through to the state-level answer
    // rather than a dead end.
  }

  return {
    kind: 'state',
    series,
    // Count only the typed series' own rows: Telangana holds both TG and
    // historical TS codes, and "TG" answering "76 codes" double-counts them.
    codes_count: state.codes.filter((c) => c.code.startsWith(series)).length,
    state: { slug: state.slug, state_name: state.state_name }
  };
}
