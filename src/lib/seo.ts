export const ORIGIN = 'https://trafficchallan.com';
/** Site launch date — the fixed datePublished for every page's WebPage node. */
export const SITE_LAUNCH_DATE = '2026-08-13';
const abs = (path: string) => ORIGIN + (path.startsWith('/') ? path : '/' + path);

export function orgJsonLd() {
  return {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: 'TrafficChallan', url: abs('/'),
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
 * .superpowers/upgrade/research.json, aeo.tactics[0]). datePublished is
 * fixed at the site launch date; dateModified/lastReviewed mirror the
 * page's visible "Last verified" date.
 */
export function webPageJsonLd(path: string, title: string, dateModified: string) {
  return {
    '@context': 'https://schema.org', '@type': 'WebPage',
    url: abs(path), name: title,
    datePublished: SITE_LAUNCH_DATE,
    dateModified,
    lastReviewed: dateModified,
    isPartOf: { '@type': 'WebSite', url: abs('/') }
  };
}
