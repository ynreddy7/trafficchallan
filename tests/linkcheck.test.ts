import { describe, it, expect } from 'vitest';
import { extractLocalHrefs, resolveToDistFile } from '../src/lib/linkcheck';

describe('extractLocalHrefs', () => {
  it('finds root-relative hrefs, ignores external and anchors', () => {
    const html = `<a href="/fines/">x</a> <a href="https://parivahan.gov.in/">y</a>
      <a href="#top">z</a> <a href="/delhi-e-challan/">d</a>`;
    expect(extractLocalHrefs(html).sort()).toEqual(['/delhi-e-challan/', '/fines/']);
  });
});
describe('resolveToDistFile', () => {
  it('maps directory URLs to index.html', () => {
    expect(resolveToDistFile('/fines/')).toBe('dist/fines/index.html');
    expect(resolveToDistFile('/llms.txt')).toBe('dist/llms.txt');
  });
});
