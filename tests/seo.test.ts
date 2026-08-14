import { describe, it, expect } from 'vitest';
import {
  breadcrumbJsonLd, faqJsonLd, howToJsonLd, orgJsonLd, websiteJsonLd, datasetJsonLd, webPageJsonLd,
  articleJsonLd, webApplicationJsonLd, stateTitle, stateH1, offenceTitle, fineAmountShort, lowerSeoName,
  SITE_LAUNCH_DATE
} from '../src/lib/seo';

describe('seo builders', () => {
  it('org has name, url and logo', () => {
    const o = orgJsonLd() as any;
    expect(o['@type']).toBe('Organization');
    expect(o.url).toBe('https://trafficchallan.com/');
    expect(o.logo).toBe('https://trafficchallan.com/favicon.svg');
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

  it('webPage jsonld carries site-launch datePublished, mirrored dateModified/lastReviewed and isPartOf, when dateModified is on/after launch', () => {
    const w = webPageJsonLd('/delhi-e-challan/', 'Delhi e-Challan', '2026-08-14') as any;
    expect(w['@type']).toBe('WebPage');
    expect(w.url).toBe('https://trafficchallan.com/delhi-e-challan/');
    expect(w.name).toBe('Delhi e-Challan');
    expect(w.datePublished).toBe(SITE_LAUNCH_DATE);
    expect(w.dateModified).toBe('2026-08-14');
    expect(w.lastReviewed).toBe('2026-08-14');
    expect(w.isPartOf).toEqual({ '@type': 'WebSite', url: 'https://trafficchallan.com/' });
  });

  it('webPage jsonld clamps datePublished to dateModified when a page was last verified before site launch', () => {
    // A record's last_verified can predate the site's own launch date (e.g.
    // sourced during pre-launch content prep). datePublished must never
    // read later than dateModified — that's a logical inversion (a page
    // claiming to be modified before it was published).
    const w = webPageJsonLd('/delhi-e-challan/', 'Delhi e-Challan', '2026-08-10') as any;
    expect(w.datePublished).toBe('2026-08-10');
    expect(w.dateModified).toBe('2026-08-10');
    expect(w.datePublished <= w.dateModified).toBe(true);
  });

  it('article carries the collective-byline author, publisher with logo, and clamped dates', () => {
    const a = articleJsonLd('How to Check an E-Challan', 'desc', '/how-to-check-e-challan/', '2026-08-13') as any;
    expect(a['@type']).toBe('Article');
    expect(a.headline).toBe('How to Check an E-Challan');
    expect(a.mainEntityOfPage['@id']).toBe('https://trafficchallan.com/how-to-check-e-challan/');
    expect(a.author).toEqual({ '@type': 'Organization', name: 'Team TrafficChallan', url: 'https://trafficchallan.com/about/' });
    expect(a.publisher['@type']).toBe('Organization');
    expect(a.publisher.logo.url).toBe('https://trafficchallan.com/favicon.svg');
    expect(a.datePublished <= a.dateModified).toBe(true);
    // pre-launch last_verified clamps datePublished exactly like webPageJsonLd
    const pre = articleJsonLd('T', 'd', '/x/', '2026-08-01') as any;
    expect(pre.datePublished).toBe('2026-08-01');
  });

  it('webApplication node is a free UtilityApplication with absolute url', () => {
    const w = webApplicationJsonLd('Traffic Fine Calculator', 'desc', '/calculator/') as any;
    expect(w['@type']).toBe('WebApplication');
    expect(w.url).toBe('https://trafficchallan.com/calculator/');
    expect(w.applicationCategory).toBe('UtilityApplication');
    expect(w.isAccessibleForFree).toBe(true);
  });
});

describe('query-language titles', () => {
  it('state title carries "Traffic Challan" and the abbr e-Challan form within ~62 chars', () => {
    const t = stateTitle('Telangana', 'TS', 2026);
    expect(t).toBe('Telangana Traffic Challan (TS e-Challan) 2026: Check & Pay');
    expect(t.length).toBeLessThanOrEqual(62);
  });
  it('long state names drop " e-Challan" from the parens to stay in budget', () => {
    const t = stateTitle('Jammu and Kashmir', 'JK', 2026);
    expect(t).toBe('Jammu and Kashmir Traffic Challan (JK) 2026: Check & Pay');
    expect(t.length).toBeLessThanOrEqual(62);
    expect(stateTitle('Andhra Pradesh', 'AP', 2026)).toBe('Andhra Pradesh Traffic Challan (AP) 2026: Check & Pay');
  });
  it('state H1 keeps the full query language', () => {
    expect(stateH1('Telangana', 'TS')).toBe('Telangana Traffic Challan (TS e-Challan): Check Status & Pay Online');
  });

  it('fineAmountShort renders single figures, ranges and no-minimum bands', () => {
    expect(fineAmountShort(1000, 1000)).toBe('₹1,000');
    expect(fineAmountShort(1000, 5000)).toBe('₹1,000–₹5,000');
    expect(fineAmountShort(0, 10000)).toBe('Up to ₹10,000');
  });
  it('offence title leads with the seo_name and amount within ~62 chars', () => {
    const t = offenceTitle('Helmet Challan Fine', 1000, 1000, 2026);
    expect(t).toBe('Helmet Challan Fine 2026: ₹1,000 Penalty & Rules');
    expect(t.length).toBeLessThanOrEqual(62);
  });
  it('offence title drops the amount when the full form exceeds the budget', () => {
    const t = offenceTitle('Mobile Phone While Driving Fine', 1000, 5000, 2026);
    expect(t).toBe('Mobile Phone While Driving Fine 2026: Penalty & Rules');
    expect(t.length).toBeLessThanOrEqual(62);
  });
  it('lowerSeoName lowercases while preserving acronyms', () => {
    expect(lowerSeoName('PUC Challan Fine')).toBe('PUC challan fine');
    expect(lowerSeoName('Drink and Drive Fine')).toBe('drink and drive fine');
    expect(lowerSeoName('Driving Without RC Fine')).toBe('driving without RC fine');
  });
});
