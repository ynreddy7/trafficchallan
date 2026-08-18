/**
 * Source-provenance measurement for the /data/ open-data page.
 *
 * The page has to state, in plain English, how well-sourced each dataset
 * actually is — including where it is weak. Those figures are MEASURED from
 * the repo's own `sources` arrays at build time, never written by hand, so a
 * dataset that quietly acquires a blog citation changes the published number
 * on its own.
 *
 * Three buckets, deliberately not two:
 *  - `gov`            — an Indian government hostname (.gov.in / .nic.in).
 *  - `gov-other-tld`  — an official government/statutory body site that does
 *                       NOT sit on .gov.in or .nic.in. Every such host is on
 *                       the explicit allow-list below; nothing is inferred
 *                       from the TLD (a bare ".org" test would sweep in
 *                       commercial sites, and treating every non-.gov.in host
 *                       as third-party understates real state transport
 *                       department sites such as aptransport.org).
 *  - `third-party`    — everything else: press, legal databases, commercial
 *                       insurance/used-car directories.
 */

/**
 * Official government / statutory-body sites that do not use a .gov.in or
 * .nic.in hostname. A host enters this list only after being fetched and
 * confirmed; the note records what identified it and the day it was checked.
 * Adding a host here moves citations from `third-party` to official, so the
 * evidence has to be on the record.
 */
export const OFFICIAL_NON_GOV_HOSTS: Record<string, string> = {
  'aptransport.org':
    'Transport Department, Government of Andhra Pradesh — masthead reads "TRANSPORT DEPARTMENT GOVERNMENT OF ANDHRA PRADESH - INDIA" (fetched 2026-08-19)',
  'punjabtransport.org':
    'Department of Transport, Government of Punjab — footer reads "Site and portal Developed, maintained and managed by Transport Department" (fetched 2026-08-19)',
  'wbtrafficpolice.com':
    'West Bengal Traffic Police — carries the ADGP (Traffic & Road Safety) message and Transport Department, Government of West Bengal references (fetched 2026-08-19)',
  'kolkatatrafficpolice.net':
    'Kolkata Traffic Police — now 302-redirects to the state government portal sanjog.wb.gov.in (fetched 2026-08-19)',
  'dslsa.org':
    'Delhi State Legal Services Authority — statutory body constituted under the Legal Services Authorities Act, 1987, under the administrative control of the High Court of Delhi (fetched 2026-08-19)'
};

export type SourceClass = 'gov' | 'gov-other-tld' | 'third-party';

/** Lower-cased hostname with a leading "www." stripped. Throws on a non-URL. */
export function sourceHost(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
}

/**
 * Government-domain test. Exact `gov.in`/`nic.in` or a true subdomain of
 * either — "evilgov.in" and "gov.in.example.com" must not pass, which is why
 * this is a suffix test on the dot boundary rather than a substring search.
 */
export function isGovHost(host: string): boolean {
  return ['gov.in', 'nic.in'].some((d) => host === d || host.endsWith('.' + d));
}

export function classifySource(url: string): SourceClass {
  const host = sourceHost(url);
  if (isGovHost(host)) return 'gov';
  if (host in OFFICIAL_NON_GOV_HOSTS) return 'gov-other-tld';
  return 'third-party';
}

/** Official = a government hostname OR a verified allow-listed government site. */
export function isOfficialSource(url: string): boolean {
  return classifySource(url) !== 'third-party';
}

export interface HostCount {
  host: string;
  count: number;
}

export interface ProvenanceStats {
  /** Number of data files measured. */
  files: number;
  /** Total source citations across those files. */
  citations: number;
  gov: number;
  govOtherTld: number;
  /** gov + govOtherTld. */
  official: number;
  thirdParty: number;
  /** official / citations, rounded to a whole percent. 0 when there are none. */
  officialPct: number;
  /** Slugs of files whose sources contain no official citation at all. */
  filesWithoutOfficial: string[];
  /** Third-party hosts, most-cited first. */
  thirdPartyHosts: HostCount[];
  /** Allow-listed non-.gov.in official hosts actually used, most-cited first. */
  officialNonGovHosts: HostCount[];
}

export interface SourcedRecord {
  slug: string;
  sources: string[];
}

const byCountDesc = (a: HostCount, b: HostCount) => b.count - a.count || a.host.localeCompare(b.host);
const tally = (m: Map<string, number>): HostCount[] =>
  [...m].map(([host, count]) => ({ host, count })).sort(byCountDesc);

/** Measures one dataset's provenance from the records' own `sources` arrays. */
export function provenanceOf(records: SourcedRecord[]): ProvenanceStats {
  let gov = 0;
  let govOtherTld = 0;
  let thirdParty = 0;
  const filesWithoutOfficial: string[] = [];
  const thirdHosts = new Map<string, number>();
  const officialOtherHosts = new Map<string, number>();

  for (const rec of records) {
    let officialHere = 0;
    for (const url of rec.sources) {
      const host = sourceHost(url);
      const cls = classifySource(url);
      if (cls === 'gov') {
        gov++;
        officialHere++;
      } else if (cls === 'gov-other-tld') {
        govOtherTld++;
        officialHere++;
        officialOtherHosts.set(host, (officialOtherHosts.get(host) ?? 0) + 1);
      } else {
        thirdParty++;
        thirdHosts.set(host, (thirdHosts.get(host) ?? 0) + 1);
      }
    }
    if (officialHere === 0) filesWithoutOfficial.push(rec.slug);
  }

  const official = gov + govOtherTld;
  const citations = official + thirdParty;
  return {
    files: records.length,
    citations,
    gov,
    govOtherTld,
    official,
    thirdParty,
    officialPct: citations ? Math.round((official / citations) * 100) : 0,
    filesWithoutOfficial,
    thirdPartyHosts: tally(thirdHosts),
    officialNonGovHosts: tally(officialOtherHosts)
  };
}
