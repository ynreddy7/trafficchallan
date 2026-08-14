/**
 * Shared helpers for the RTO code pages: the /rto-codes/ lookup index and the
 * 36 per-state hub pages (/rto-codes/{state}/). Pure and browser-safe (type
 * imports only) — the index page's lookup island imports the href helpers so
 * the result links and the server-rendered directory can never drift apart,
 * and tests exercise every helper against the real data/rto/ files.
 */

import type { RtoStateRecord } from './schemas';
import type { LinkItem } from './links';

/** Canonical URL of a state's RTO hub page. */
export function rtoStateHref(slug: string): string {
  return `/rto-codes/${slug}/`;
}

/**
 * Deep link to one code's row on its state hub — the per-row anchor id is the
 * code lowercased ("MH12" → /rto-codes/maharashtra/#mh12).
 */
export function rtoCodeHref(slug: string, code: string): string {
  return `${rtoStateHref(slug)}#${code.toLowerCase()}`;
}

/** SERP truncation budget — mirrors src/lib/seo.ts TITLE_MAX. */
const TITLE_MAX = 60;

/**
 * Hub page <title> in query language ("maharashtra rto code list"):
 * "{State} RTO Code List ({series}): All {n} Codes & Offices". Long names
 * (Andaman and Nicobar Islands…) fall back to "{State} RTO Codes ({series})"
 * to stay inside the SERP budget; a single-code state takes the same fallback
 * so the title never reads "All 1 Codes".
 */
export function rtoHubTitle(stateName: string, series: string[], codeCount: number): string {
  const s = series.join(', ');
  const full = `${stateName} RTO Code List (${s}): All ${codeCount} Codes & Offices`;
  if (codeCount > 1 && full.length <= TITLE_MAX) return full;
  return `${stateName} RTO Codes (${s})`;
}

/**
 * Per-state verification disclosure, derived straight from the verification
 * block so the page can never overclaim (CONTENT_STANDARDS rule 12). One
 * implementation for every page that renders a state's code table.
 */
export function rtoDisclosure(r: Pick<RtoStateRecord, 'codes' | 'verification' | 'sources'>): string {
  const n = r.codes.length;
  const codes = (k: number) => `${k} code${k === 1 ? '' : 's'}`;
  if (r.verification.method === 'full') {
    return `All ${codes(n)} verified against the official state transport department list.`;
  }
  const sampled = r.verification.sample_size ?? 0;
  return r.verification.official_list_available
    ? `Sample-verified: ${sampled} of ${codes(n)} checked against the official transport department list and independent directories.`
    : `Sample-verified: ${sampled} of ${codes(n)} checked against ${r.sources.length} independent sources — no fetchable official list.`;
}

/**
 * Compact per-state source labels: repeated hostnames within a state get a
 * counter so every URL stays visible without repeating the domain text.
 */
export function rtoSourceLabels(sources: string[]): { url: string; label: string }[] {
  const seen = new Map<string, number>();
  return sources.map((url) => {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const n = (seen.get(host) ?? 0) + 1;
    seen.set(host, n);
    return { url, label: n === 1 ? host : `${host} (${n})` };
  });
}

/**
 * Related links for a hub page: the state's e-challan page and /fines/{state}/
 * list when those pages exist (callers pass the slug sets derived from
 * data/states/ — the RTO dataset covers all 36 states/UTs, the site's state
 * pages only some), and always the lookup index.
 */
export function rtoHubRelated(
  r: Pick<RtoStateRecord, 'slug' | 'state_name'>,
  siteStateSlugs: ReadonlySet<string>,
  fineListSlugs: ReadonlySet<string>
): LinkItem[] {
  const items: LinkItem[] = [];
  if (siteStateSlugs.has(r.slug)) {
    items.push({ href: `/${r.slug}-e-challan/`, label: `${r.state_name} e-challan: check & pay` });
  }
  if (fineListSlugs.has(r.slug)) {
    items.push({ href: `/fines/${r.slug}/`, label: `${r.state_name} traffic fines list` });
  }
  items.push({ href: '/rto-codes/', label: 'RTO code lookup: every state and union territory' });
  return items;
}
