/**
 * Vehicle-number / state-name → state router (homepage portal finder).
 * Pure and side-effect free: never touches the network, never sends the
 * typed value anywhere. The state list a caller passes in is expected to be
 * one row per RTO code (Telangana appears twice, once for TS and once for
 * TG), because a code and a state are not a 1:1 relationship.
 */

export interface RtoStateEntry {
  slug: string;
  name: string;
  code: string;
}

export type PortalFinderResult =
  | { kind: 'state'; slug: string }
  | { kind: 'unknown-code'; code: string }
  | { kind: 'invalid' };

/**
 * Real Indian state/UT RTO series codes that this site has no dedicated
 * guide for yet. Kept separate from the covered-state map so an honest
 * "we don't cover this yet" answer is possible instead of a bare "invalid"
 * for a code the reader typed correctly.
 */
const KNOWN_UNCOVERED_CODES = new Set([
  'KL', 'PB', 'BR', 'OD', 'CH', 'UK', 'DN', 'LA', 'PY', 'SK', 'GA', 'AS',
  'ML', 'MN', 'MZ', 'NL', 'TR', 'AR', 'HP', 'JH', 'CG', 'BH', 'AN', 'LD', 'DD'
]);

export function resolveVehicleInput(input: string, states: RtoStateEntry[]): PortalFinderResult {
  const trimmed = input.trim();
  if (!trimmed) return { kind: 'invalid' };

  // Vehicle-registration / bare-RTO-code path: strip spaces and hyphens,
  // uppercase, and take the first two letters as a candidate code — but
  // only when the shape actually looks like a code (a bare two-letter
  // string like "TG", or two letters immediately followed by a digit like
  // "MH12AB1234" or "KL01"). This deliberately excludes an attempted state
  // name like "Kar" or "karnataka", where the third character is a letter.
  const compact = trimmed.replace(/[\s-]/g, '').toUpperCase();
  const looksLikeCode = /^[A-Z]{2}/.test(compact) && (compact.length === 2 || /[0-9]/.test(compact[2]));

  if (looksLikeCode) {
    const code = compact.slice(0, 2);
    const covered = states.find((s) => s.code === code);
    if (covered) return { kind: 'state', slug: covered.slug };
    if (KNOWN_UNCOVERED_CODES.has(code)) return { kind: 'unknown-code', code };
  }

  // Typed state-name path: minimum 3 characters, exact match first, then a
  // prefix match so "Kar" reaches "Karnataka".
  if (trimmed.length >= 3) {
    const lower = trimmed.toLowerCase();
    const exact = states.find((s) => s.name.toLowerCase() === lower);
    if (exact) return { kind: 'state', slug: exact.slug };
    const prefix = states.find((s) => s.name.toLowerCase().startsWith(lower));
    if (prefix) return { kind: 'state', slug: prefix.slug };
  }

  return { kind: 'invalid' };
}
