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
