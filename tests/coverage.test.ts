import { describe, it, expect } from 'vitest';
import { normalise, distinctiveTerms, pageText, candidatePaths, isProse } from '../scripts/coverage';

describe('normalise', () => {
  it('flattens the spellings of the same word to one form', () => {
    expect(normalise('E-Challan Check')).toBe('e challan check');
    expect(normalise('echallan.parivahan.gov.in')).toBe('echallan parivahan gov in');
  });
});

describe('distinctiveTerms', () => {
  it('drops head terms every challan page carries', () => {
    expect(distinctiveTerms('traffic challan photo')).toEqual(['photo']);
    expect(distinctiveTerms('online e challan india')).toEqual([]);
  });

  it('rejoins misspellings split across two tokens', () => {
    // "lan" is not a word the page should ever print.
    expect(distinctiveTerms('echal lan parivahan gov in')).toEqual(['parivahan']);
  });

  it('folds misspellings onto the canonical word', () => {
    expect(distinctiveTerms('echalan parivahan com')).toEqual(['parivahan']);
  });

  it('keeps the terms that actually distinguish an intent', () => {
    expect(distinctiveTerms('challan check by vehicle number')).toEqual(['check', 'by', 'vehicle', 'number']);
  });
});

describe('pageText', () => {
  it('ignores script and style content so markup cannot satisfy a keyword', () => {
    const html = '<p>Helmet fine</p><script>var token = "waiver";</script><style>.a{content:"photo"}</style>';
    const t = pageText(html);
    expect(t).toContain('helmet fine');
    expect(t).not.toContain('waiver');
    expect(t).not.toContain('photo');
  });
});

describe('candidatePaths', () => {
  it('resolves the queue\'s loose covered_by shapes', () => {
    expect(candidatePaths('homepage')).toEqual(['index.html']);
    expect(candidatePaths('challan-status')[0]).toContain('challan-status');
    expect(candidatePaths('driving-without-helmet').some((p) => p.includes('fines'))).toBe(true);
  });
});

describe('isProse', () => {
  it('tells a page reference from an explanation', () => {
    expect(isProse('echallan-parivahan')).toBe(false);
    expect(isProse('fines-index')).toBe(false);
    expect(isProse('too vague — mixed queries, no single coherent page')).toBe(true);
  });
});
