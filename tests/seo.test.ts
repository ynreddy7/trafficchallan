import { describe, it, expect } from 'vitest';
import { breadcrumbJsonLd, faqJsonLd, howToJsonLd, orgJsonLd, websiteJsonLd, datasetJsonLd } from '../src/lib/seo';

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
});
