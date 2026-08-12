/**
 * Extract the short section number from an mva_section string.
 * Removes the statute name and amendment history, keeping only the section reference.
 *
 * Examples:
 * - "Section 194D, Motor Vehicles Act 1988 (as amended...)" → "Section 194D"
 * - "Section 194D read with Section 129, Motor Vehicles Act 1988 (as amended...)" → "Section 194D read with Section 129"
 * - "Section 192 read with Section 39, Motor Vehicles Act 1988" → "Section 192 read with Section 39"
 * - "Section 184, Explanation clause (c), Motor Vehicles Act 1988 ..." → "Section 184, Explanation clause (c)"
 */
export function shortSection(mvaSection: string): string {
  const actIndex = mvaSection.indexOf(', Motor Vehicles Act');
  if (actIndex === -1) {
    return mvaSection;
  }
  return mvaSection.substring(0, actIndex);
}

/**
 * Returns the first sentence of a long text field (e.g. a state's
 * court_challan_process narrative), for a one-line summary. Cuts at the
 * first period that is followed by whitespace or the end of the string, so
 * it does not break mid-URL on domains like "vcourts.gov.in" where periods
 * are never followed by a space.
 */
export function firstSentence(text: string): string {
  const m = text.match(/^.*?\.(?=\s|$)/);
  return m ? m[0] : text;
}

/**
 * Returns the first clause of a free-text amount, splitting at whichever of
 * " (", "—" or ";" occurs earliest in the string — used to keep the
 * /compare/ table scannable. Returns the trimmed whole text unchanged when
 * none of those delimiters appear.
 */
export function firstClause(text: string): string {
  const delimiters = [' (', '—', ';'];
  let cut = -1;
  for (const d of delimiters) {
    const idx = text.indexOf(d);
    if (idx !== -1 && (cut === -1 || idx < cut)) cut = idx;
  }
  return cut === -1 ? text.trim() : text.slice(0, cut).trim();
}

/**
 * Slugifies visible heading text into a stable id for anchor links —
 * lowercase, non-alphanumeric runs collapsed to a single hyphen, leading/
 * trailing hyphens trimmed. Used to give server-rendered .astro headings the
 * same kind of `id` Astro's markdown pipeline already gives Markdown
 * headings, so they are deep-linkable and indexable as Pagefind sub-results.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
