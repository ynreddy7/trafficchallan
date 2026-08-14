export const ORIGIN = 'https://trafficchallan.com';
/** Site launch date — the fixed datePublished for every page's WebPage node. */
export const SITE_LAUNCH_DATE = '2026-08-13';
const abs = (path: string) => ORIGIN + (path.startsWith('/') ? path : '/' + path);

export function orgJsonLd() {
  return {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: 'TrafficChallan', url: abs('/'),
    logo: abs('/favicon.svg'),
    description: 'Independent reference on Indian traffic e-challans: how to check, pay and dispute, with sourced fine schedules.'
  };
}
export function websiteJsonLd() {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: 'TrafficChallan', url: abs('/') };
}
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path)
    }))
  };
}
export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}
export function howToJsonLd(name: string, steps: string[]) {
  return {
    '@context': 'https://schema.org', '@type': 'HowTo', name,
    step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s }))
  };
}
export interface DatasetDistribution { url: string; encodingFormat: string }

export function datasetJsonLd(
  name: string,
  description: string,
  path: string,
  distributions?: DatasetDistribution[]
) {
  return {
    '@context': 'https://schema.org', '@type': 'Dataset',
    name, description, url: abs(path), creator: orgJsonLd(), isAccessibleForFree: true, inLanguage: 'en-IN',
    ...(distributions && distributions.length
      ? { distribution: distributions.map((d) => ({ '@type': 'DataDownload', contentUrl: abs(d.url), encodingFormat: d.encodingFormat })) }
      : {})
  };
}

/**
 * WebPage node carrying machine-readable dates — the strongest single AEO
 * lever per the GEO-16 citation-prediction study (see
 * .superpowers/upgrade/research.json, aeo.tactics[0]). datePublished is the
 * site launch date, EXCEPT when a page's last_verified predates launch (a
 * source re-verified before the site's own launch date) — clamping to the
 * earlier date avoids the logical inversion of a page claiming to have been
 * modified before it was published. dateModified/lastReviewed mirror the
 * page's visible "Last verified" date.
 */
export function webPageJsonLd(path: string, title: string, dateModified: string) {
  const datePublished = dateModified < SITE_LAUNCH_DATE ? dateModified : SITE_LAUNCH_DATE;
  return {
    '@context': 'https://schema.org', '@type': 'WebPage',
    url: abs(path), name: title,
    datePublished,
    dateModified,
    lastReviewed: dateModified,
    isPartOf: { '@type': 'WebSite', url: abs('/') }
  };
}

/**
 * Article node for guide pages. Author is the site's collective byline
 * (CONTENT_STANDARDS rule 6: Team TrafficChallan, never an invented person);
 * publisher is the site Organization. datePublished clamps exactly like
 * webPageJsonLd so the two nodes on a page never disagree.
 */
export function articleJsonLd(title: string, description: string, path: string, dateModified: string) {
  const datePublished = dateModified < SITE_LAUNCH_DATE ? dateModified : SITE_LAUNCH_DATE;
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: title, description,
    url: abs(path),
    mainEntityOfPage: { '@type': 'WebPage', '@id': abs(path) },
    datePublished,
    dateModified,
    author: { '@type': 'Organization', name: 'Team TrafficChallan', url: abs('/about/') },
    publisher: {
      '@type': 'Organization', name: 'TrafficChallan', url: abs('/'),
      logo: { '@type': 'ImageObject', url: abs('/favicon.svg') }
    },
    inLanguage: 'en-IN'
  };
}

/** WebApplication node for interactive tools (/calculator/). */
export function webApplicationJsonLd(name: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name, description, url: abs(path),
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any (web browser)',
    isAccessibleForFree: true,
    inLanguage: 'en-IN'
  };
}

/* --- Query-language titles (CONTENT_STANDARDS rule 14) ------------------- */

/** SERP truncation budget: keep titles at or under ~62 characters. */
const TITLE_MAX = 62;

/**
 * State page <title>. People search "traffic challan" and the registration
 * abbreviation ("e challan ts"), so both lead the title. Long state names
 * (Jammu and Kashmir, Andhra Pradesh…) drop " e-Challan" from the parens to
 * stay inside the SERP budget.
 */
export function stateTitle(name: string, abbr: string, year: number): string {
  const full = `${name} Traffic Challan (${abbr} e-Challan) ${year}: Check & Pay`;
  if (full.length <= TITLE_MAX) return full;
  return `${name} Traffic Challan (${abbr}) ${year}: Check & Pay`;
}

/** State page H1 — same query language as the title, no year. */
export function stateH1(name: string, abbr: string): string {
  return `${name} Traffic Challan (${abbr} e-Challan): Check Status & Pay Online`;
}

/**
 * Compact ₹ display of an offence's statutory fine band: a single figure,
 * a range, or "Up to ₹X" where the statute sets no minimum. Pure formatting
 * of the sourced base_fine_min/base_fine_max fields — never a new fact.
 */
export function fineAmountShort(min: number, max: number): string {
  const inr = (n: number) => '₹' + new Intl.NumberFormat('en-IN').format(n);
  if (min === max) return inr(min);
  if (min === 0) return `Up to ${inr(max)}`;
  return `${inr(min)}–${inr(max)}`;
}

/**
 * Fine page <title> from the record's query-language seo_name. Falls back to
 * dropping the amount when the full form would blow the SERP budget.
 */
export function offenceTitle(seoName: string, min: number, max: number, year: number): string {
  const full = `${seoName} ${year}: ${fineAmountShort(min, max)} Penalty & Rules`;
  if (full.length <= TITLE_MAX) return full;
  return `${seoName} ${year}: Penalty & Rules`;
}

/**
 * Lowercases a query-language name for mid-sentence use while preserving
 * all-caps acronyms ("PUC Challan Fine" → "PUC challan fine").
 */
export function lowerSeoName(name: string): string {
  return name
    .split(' ')
    .map((w) => (w === w.toUpperCase() && /[A-Z]/.test(w) ? w : w.toLowerCase()))
    .join(' ');
}
