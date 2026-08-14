/**
 * Portal ROUTING — which official portal actually transacts a given state's
 * challans.
 *
 * This is a different question from "which domains are official" (that is the
 * allow-list on /fake-challan-sms/, driven by data/official-portals.json).
 * Here the input is the state records' own `portals` arrays, and the output
 * answers the question people actually fail at: they open one national
 * address, see nothing, and conclude the challan does not exist — when their
 * state was migrated to the other national portal, or transacts on its own
 * state portal instead.
 *
 * Pure and side-effect free. Every fact it emits is derived from an already
 * sourced, dated state record — this module invents nothing.
 */

import type { StateRecord } from './schemas';
import type { RtoStateEntry } from './portal-finder';

/** The legacy national eChallan portal (MoRTH/NIC). */
export const NATIONAL_LEGACY_HOST = 'echallan.parivahan.gov.in';
/** The NextGen national eChallan portal (MoRTH/NIC). */
export const NATIONAL_NEXTGEN_HOST = 'echallan.parivahan.nic.in';

/**
 * Court properties are neither a national eChallan portal nor a state's own
 * challan portal — a challan reaches them only after being forwarded, which
 * /challan-status/ covers. Excluding them keeps the "does this state run its
 * own portal?" answer honest.
 */
const COURT_HOSTS = new Set(['vcourts.gov.in', 'pay.ecourts.gov.in']);

/**
 * RTO series code → state slug, for the portal finder. One entry per code:
 * Telangana carries both TS (the searched form) and TG (current plates), so
 * code → slug is many-to-one and deliberately not inverted anywhere.
 * Shared by the homepage finder and /echallan-parivahan/ so the two can never
 * disagree about which plate prefix reaches which state.
 */
export const RTO_CODE_TO_SLUG: Record<string, string> = {
  AP: 'andhra-pradesh',
  DL: 'delhi',
  GJ: 'gujarat',
  HR: 'haryana',
  JK: 'jammu-kashmir',
  KA: 'karnataka',
  MP: 'madhya-pradesh',
  MH: 'maharashtra',
  RJ: 'rajasthan',
  TN: 'tamil-nadu',
  TS: 'telangana',
  TG: 'telangana',
  UP: 'uttar-pradesh',
  WB: 'west-bengal'
};

/**
 * {code, slug, name} rows for resolveVehicleInput(), built from the passed-in
 * states. A code whose slug has no state record is dropped rather than
 * guessed at, so removing a state page can never produce a dead route.
 */
export function rtoStateEntries(states: { slug: string; name: string }[]): RtoStateEntry[] {
  const bySlug = new Map(states.map((s) => [s.slug, s]));
  return Object.entries(RTO_CODE_TO_SLUG)
    .map(([code, slug]) => {
      const s = bySlug.get(slug);
      return s ? { code, slug, name: s.name } : null;
    })
    .filter((x): x is RtoStateEntry => x !== null);
}

/** Bare hostname of a URL, `www.` stripped — the form the allow-list uses. */
export function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

/**
 * The legacy portal's migration notice, as quoted verbatim inside the state
 * records that carry it (data/states/haryana.json, jammu-kashmir.json and
 * tamil-nadu.json each reproduce the notice board's own wording, with their
 * own sources and dates).
 */
const NEXTGEN_NOTICE_RE =
  /check and pay your challans of ([A-Z]{2}(?:,\s*[A-Z]{2})+)\s+States on NextGen eChallan Portal/;

/**
 * The state/UT codes the legacy portal's notice board sends to NextGen, read
 * back out of that quote in the order the notice lists them.
 *
 * Pages state how far the migration reaches by counting this, never by typing
 * a number into prose: the figure then cannot drift away from the sourced
 * wording, and a re-read notice updates the pages by itself. Returns [] when
 * no record quotes the notice, so a caller can drop the figure rather than
 * render a wrong one.
 */
export function nextgenNoticeCodes(states: StateRecord[]): string[] {
  for (const s of states) {
    for (const q of s.quirks) {
      const m = q.match(NEXTGEN_NOTICE_RE);
      if (m) return m[1].split(',').map((c) => c.trim());
    }
  }
  return [];
}

export type NationalPortalKind = 'nextgen' | 'legacy' | 'none';

export interface RoutedPortal {
  label: string;
  url: string;
  host: string;
}

export interface StateRouting {
  slug: string;
  name: string;
  abbr: string;
  /** Which national eChallan portal transacts this state's challans. */
  national: NationalPortalKind;
  nationalPortal: RoutedPortal | null;
  /** The state's own transacting portals (one row per host, first wins). */
  stateOwn: RoutedPortal[];
}

/** A portal you can actually settle a challan through, not just read on. */
const transacts = (scope: 'check' | 'pay' | 'both') => scope === 'both' || scope === 'pay';

/**
 * Classifies one state record.
 *
 * NextGen wins over legacy when both are present as transacting portals: the
 * migrated states still list the legacy page (their police sites link it, and
 * it carries the notice sending those users onward), so preferring NextGen
 * reflects where the challan actually lives rather than which link is older.
 */
export function classifyStateRouting(state: StateRecord): StateRouting {
  const transacting = state.portals
    .filter((p) => transacts(p.scope))
    .map((p) => ({ label: p.label, url: p.url, host: hostOf(p.url) }));

  const nextgen = transacting.find((p) => p.host === NATIONAL_NEXTGEN_HOST);
  const legacy = transacting.find((p) => p.host === NATIONAL_LEGACY_HOST);
  const nationalPortal = nextgen ?? legacy ?? null;
  const national: NationalPortalKind = nextgen ? 'nextgen' : legacy ? 'legacy' : 'none';

  const stateOwn: RoutedPortal[] = [];
  const seen = new Set<string>();
  for (const p of transacting) {
    if (p.host === NATIONAL_LEGACY_HOST || p.host === NATIONAL_NEXTGEN_HOST) continue;
    if (COURT_HOSTS.has(p.host)) continue;
    if (seen.has(p.host)) continue;
    seen.add(p.host);
    stateOwn.push(p);
  }

  return { slug: state.slug, name: state.name, abbr: state.abbr, national, nationalPortal, stateOwn };
}

/**
 * The routing split the directory is organised by: states whose challans are
 * transacted on a national portal only, versus states that also run their own
 * challan portal. Both lists stay sorted by state name.
 */
export function groupByRouting(routings: StateRouting[]): {
  nationalOnly: StateRouting[];
  stateRun: StateRouting[];
} {
  const byName = (a: StateRouting, b: StateRouting) => a.name.localeCompare(b.name);
  return {
    nationalOnly: routings.filter((r) => r.stateOwn.length === 0).sort(byName),
    stateRun: routings.filter((r) => r.stateOwn.length > 0).sort(byName)
  };
}

/** Counts per national portal — rendered as figures, never hardcoded in prose. */
export function countByNational(routings: StateRouting[]): Record<NationalPortalKind, number> {
  return {
    nextgen: routings.filter((r) => r.national === 'nextgen').length,
    legacy: routings.filter((r) => r.national === 'legacy').length,
    none: routings.filter((r) => r.national === 'none').length
  };
}
