import type { StateRecord, OffenceRecord } from './schemas';
import { hasFineListPage } from './fine-list';

export interface LinkItem { href: string; label: string }

/**
 * A guide reference with its real display title. links.ts stays a pure lib
 * (no astro:content access), so callers resolve titles at the page layer:
 * `(await getCollection('guides')).map((g) => ({ slug: g.id, title: g.data.title }))`
 * — sorted by slug so the rotation below is stable across builds.
 */
export interface GuideRef { slug: string; title: string }

/** FNV-1a 32-bit — deterministic across builds and platforms. */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Deterministically picks `count` guides for a page, rotated by the page's
 * slug, so contextual link equity spreads across ALL guides instead of the
 * same two being pinned site-wide. Consecutive picks from a hashed start
 * index; with the current 13 state + 10 fine pages every guide gets several
 * inbound contextual links (tests/links.test.ts asserts full coverage from
 * state pages alone).
 */
export function rotatedGuides(seed: string, guides: GuideRef[], count = 2): GuideRef[] {
  if (guides.length <= count) return [...guides];
  const start = hashSeed(seed) % guides.length;
  return Array.from({ length: count }, (_, i) => guides[(start + i) % guides.length]);
}

export function relatedForState(state: StateRecord, offences: OffenceRecord[], guides: GuideRef[]): LinkItem[] {
  const overridden = offences.filter((o) => o.slug in state.fine_overrides);
  const rest = offences.filter((o) => !(o.slug in state.fine_overrides));
  const finePicks = [...overridden, ...rest].slice(0, 2);
  // States with a /fines/{state}/ list page (hasFineListPage) link their own
  // list in place of the generic /fines/ hub — the list page itself links the
  // hub, so hub equity survives while the state page gets the deeper link.
  const fineListLink = hasFineListPage(state)
    ? { href: `/fines/${state.slug}/`, label: `Full ${state.name} fine list` }
    : { href: '/fines/', label: 'Full traffic fine list' };
  return [
    ...finePicks.map((o) => ({ href: `/fines/${o.slug}/`, label: `${o.name}: fine amount` })),
    { href: '/challan-discount/', label: `Is there a ${state.name} challan discount right now?` },
    { href: '/challan-status/', label: 'Challan status decoder: what each status term means' },
    { href: '/calculator/', label: 'Traffic fine calculator' },
    fineListLink,
    ...rotatedGuides(state.slug, guides).map((g) => ({ href: `/${g.slug}/`, label: g.title }))
  ].slice(0, 8);
}

/** Related links for a /fines/{state}/ fine-list page. */
export function relatedForFineList(state: StateRecord): LinkItem[] {
  return [
    { href: `/${state.slug}-e-challan/`, label: `${state.name} e-challan: check & pay` },
    { href: '/calculator/', label: 'Traffic fine calculator' },
    { href: '/fines/', label: 'Full traffic fine list' },
    { href: '/compare/', label: 'Compare traffic fines across states' }
  ];
}

export function relatedForOffence(offence: OffenceRecord, states: StateRecord[], guides: GuideRef[]): LinkItem[] {
  const withOverride = states.filter((s) => offence.slug in s.fine_overrides);
  const rest = states.filter((s) => !(offence.slug in s.fine_overrides));
  const picks = [...withOverride, ...rest].slice(0, 4);
  return [
    ...picks.map((s) => ({ href: `/${s.slug}-e-challan/`, label: `${s.name} e-challan: check & pay` })),
    { href: '/calculator/', label: 'Traffic fine calculator' },
    { href: '/compare/', label: 'Compare traffic fines across states' },
    ...rotatedGuides(offence.slug, guides).map((g) => ({ href: `/${g.slug}/`, label: g.title }))
  ].slice(0, 8);
}
