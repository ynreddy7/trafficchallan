import type { StateRecord, OffenceRecord } from './schemas';

export interface LinkItem { href: string; label: string }

export function relatedForState(state: StateRecord, offences: OffenceRecord[], guideSlugs: string[]): LinkItem[] {
  const overridden = offences.filter((o) => o.slug in state.fine_overrides);
  const rest = offences.filter((o) => !(o.slug in state.fine_overrides));
  const picks = [...overridden, ...rest].slice(0, 5);
  return [
    ...picks.map((o) => ({ href: `/fines/${o.slug}/`, label: `${o.name}: fine amount` })),
    { href: '/fines/', label: 'Full traffic fine list' },
    ...guideSlugs.slice(0, 2).map((g) => ({ href: `/${g}/`, label: g.replace(/-/g, ' ') }))
  ].slice(0, 8);
}

export function relatedForOffence(offence: OffenceRecord, states: StateRecord[], guideSlugs: string[]): LinkItem[] {
  const withOverride = states.filter((s) => offence.slug in s.fine_overrides);
  const rest = states.filter((s) => !(offence.slug in s.fine_overrides));
  const picks = [...withOverride, ...rest].slice(0, 5);
  return [
    ...picks.map((s) => ({ href: `/${s.slug}-e-challan/`, label: `${s.name} e-challan: check & pay` })),
    { href: '/calculator/', label: 'Fine calculator' },
    ...guideSlugs.slice(0, 2).map((g) => ({ href: `/${g}/`, label: g.replace(/-/g, ' ') }))
  ].slice(0, 8);
}
