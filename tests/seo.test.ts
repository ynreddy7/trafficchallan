import { describe, it, expect } from 'vitest';
import { breadcrumbJsonLd, faqJsonLd, howToJsonLd, orgJsonLd, websiteJsonLd, datasetJsonLd, webPageJsonLd, SITE_LAUNCH_DATE } from '../src/lib/seo';

describe('seo builders', () => {
  it('org has name and url', () => {
    const o = orgJsonLd() as any;
    expect(o['@type']).toBe('Organization');
    expect(o.url).toBe('https://trafficchallan.com/');
  });
  it('website builder emits WebSite', () => {
    expect((websiteJsonLd() as any)['@type']).toBe('WebSite');
  });
  it('breadcrumb positions are 1-based and absolute', () => {
    const b = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Fines', path: '/fines/' }]) as any;
    expect(b.itemListElement[1].position).toBe(2);
    expect(b.itemListElement[1].item).toBe('https://trafficchallan.com/fines/');
  });
  it('faq maps q/a to Question/Answer', () => {
    const f = faqJsonLd([{ q: 'Q?', a: 'A.' }]) as any;
    expect(f.mainEntity[0]['@type']).toBe('Question');
    expect(f.mainEntity[0].acceptedAnswer.text).toBe('A.');
  });
  it('howto emits ordered HowToSteps', () => {
    const h = howToJsonLd('Check challan', ['One', 'Two']) as any;
    expect(h.step).toHaveLength(2);
    expect(h.step[0]['@type']).toBe('HowToStep');
  });
  it('dataset carries absolute url', () => {
    expect((datasetJsonLd('Fines', 'desc', '/fines/') as any).url).toBe('https://trafficchallan.com/fines/');
  });
  it('dataset omits distribution when none given', () => {
    const d = datasetJsonLd('Fines', 'desc', '/fines/') as any;
    expect(d.distribution).toBeUndefined();
  });
  it('dataset carries DataDownload distributions with absolute contentUrl', () => {
    const d = datasetJsonLd('Fines', 'desc', '/fines/', [
      { url: '/api/fines.json', encodingFormat: 'application/json' },
      { url: '/api/fines.csv', encodingFormat: 'text/csv' }
    ]) as any;
    expect(d.distribution).toHaveLength(2);
    expect(d.distribution[0]).toEqual({
      '@type': 'DataDownload', contentUrl: 'https://trafficchallan.com/api/fines.json', encodingFormat: 'application/json'
    });
  });

  it('webPage jsonld carries fixed datePublished, mirrored dateModified/lastReviewed and isPartOf', () => {
    const w = webPageJsonLd('/delhi-e-challan/', 'Delhi e-Challan', '2026-08-10') as any;
    expect(w['@type']).toBe('WebPage');
    expect(w.url).toBe('https://trafficchallan.com/delhi-e-challan/');
    expect(w.name).toBe('Delhi e-Challan');
    expect(w.datePublished).toBe(SITE_LAUNCH_DATE);
    expect(w.dateModified).toBe('2026-08-10');
    expect(w.lastReviewed).toBe('2026-08-10');
    expect(w.isPartOf).toEqual({ '@type': 'WebSite', url: 'https://trafficchallan.com/' });
  });
});
