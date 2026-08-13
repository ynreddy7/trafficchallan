/**
 * Vehicle-number / state-name → state router (homepage portal finder).
 * Pure and side-effect free: never touches the network, never sends the
 * typed value anywhere. The state list a caller passes in is expected to be
 * one row per RTO code (Telangana appears twice, once for TS and once for
 * TG), because a code and a state are not a 1:1 relationship.
 *
 * Plate parsing (normalization + "looks like a code") is shared with the
 * /rto-codes/ lookup — see normalizePlate/plateSeries in rto-lookup.ts.
 */

import { normalizePlate, plateSeries } from './rto-lookup';

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

  // Vehicle-registration / bare-RTO-code path: normalize (strip spaces,
  // hyphens and dots, uppercase) and take the series prefix as a candidate
  // code when the shape actually looks like one — shared helpers with the
  // /rto-codes/ lookup, see rto-lookup.ts.
  const code = plateSeries(normalizePlate(trimmed));

  if (code) {
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
