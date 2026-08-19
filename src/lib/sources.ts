/**
 * Classifies a source URL by what kind of authority it carries.
 *
 * This exists because /challan-discount/ renders a scheme's first source in a
 * column headed "Order / source". A bare hostname in that column reads as
 * "this is the government order" — so when the only source we hold is a news
 * report, the page was presenting a blog as the order itself. The page's whole
 * claim is that a discount is real only when a government order says so, which
 * makes an unlabelled press hostname there the most damaging kind of error:
 * the layout asserts something the data does not support.
 *
 * 'court' is kept distinct from 'official' deliberately. A High Court order
 * reproducing a notification is strong evidence the notification exists and
 * says what we claim, but it is not the issuing department's own record — the
 * Bihar scheme is evidenced this way and readers should be able to see that.
 */
export type SourceKind = 'official' | 'court' | 'press';

/** Government publication: any Indian government or public-sector domain. */
const OFFICIAL_SUFFIXES = ['.gov.in', '.nic.in'];

/** Reproduces primary court and statutory text verbatim. */
const COURT_HOSTS = ['indiankanoon.org'];

export function sourceKind(url: string): SourceKind {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return 'press';
  }
  if (COURT_HOSTS.includes(host)) return 'court';
  if (OFFICIAL_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s))) return 'official';
  return 'press';
}

/**
 * The words shown next to the link. Never returns an empty string: a source
 * that cannot be described is a source that should not be cited.
 */
export function sourceKindLabel(kind: SourceKind): string {
  switch (kind) {
    case 'official': return 'official record';
    case 'court': return 'court record';
    case 'press': return 'press report — not an order';
  }
}

/**
 * The strongest source in a list, for deciding what a row leads with. Order
 * matters: official beats court beats press, regardless of array position, so
 * a record can never be made to look better by reordering its sources.
 */
export function bestSource(urls: readonly string[]): { url: string; kind: SourceKind } | null {
  if (!urls.length) return null;
  const rank: Record<SourceKind, number> = { official: 0, court: 1, press: 2 };
  let best = urls[0];
  let bestKind = sourceKind(urls[0]);
  for (const url of urls.slice(1)) {
    const kind = sourceKind(url);
    if (rank[kind] < rank[bestKind]) {
      best = url;
      bestKind = kind;
    }
  }
  return { url: best, kind: bestKind };
}
