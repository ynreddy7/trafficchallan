export const ORIGIN = 'https://trafficchallan.com';
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
export function datasetJsonLd(name: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org', '@type': 'Dataset',
    name, description, url: abs(path), creator: orgJsonLd(), isAccessibleForFree: true, inLanguage: 'en-IN'
  };
}
