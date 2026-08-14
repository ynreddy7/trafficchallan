import type { StateRecord, OffenceRecord } from './schemas';
import { shortSection } from './format';

/**
 * A state gets a /fines/{state}/ list page ONLY when its record carries at
 * least one verified, sourced fine_override. States whose records hold zero
 * verified state-notified amounts (telangana, madhya-pradesh, jammu-kashmir
 * today) must NOT get a "{State} fines list" page — rendering the statutory
 * schedule under a state's name would present amounts as that state's that
 * the data does not verify.
 *
 * This predicate is the single source of truth for which list pages exist:
 * src/pages/fines/[slug].astro derives its state paths from it, gate.ts
 * claims keyword/slug registrations from it, and links.ts uses it to decide
 * whether a state's related links point at the state list or the /fines/ hub.
 * astro.config.mjs mirrors it structurally (fine_overrides non-empty) when
 * assigning sitemap lastmod entries — change both together.
 */
export function hasFineListPage(state: StateRecord): boolean {
  return Object.keys(state.fine_overrides).length > 0;
}

/** One row of a /fines/{state}/ list table — pure data, rendered by the page. */
export interface FineListRow {
  slug: string;
  name: string;
  /** The amount as it applies in the state: the override's amount_text where
   * one exists, the statutory base_fine_text otherwise. */
  amountText: string;
  /** true = state-notified override; false = statutory fallback, which the
   * page must visibly label as not state-verified (the honest-labeling rule). */
  overridden: boolean;
  /** Short legal basis, e.g. "Section 194D read with Section 129". */
  section: string;
}

/** Builds the offence-by-offence rows for a state's fine-list page. */
export function fineListRows(state: StateRecord, offences: OffenceRecord[]): FineListRow[] {
  return offences.map((o) => {
    const override = state.fine_overrides[o.slug];
    return {
      slug: o.slug,
      name: o.name,
      amountText: override ? override.amount_text : o.base_fine_text,
      overridden: Boolean(override),
      section: shortSection(o.mva_section)
    };
  });
}
