import { describe, it, expect } from 'vitest';
import { extractLocalHrefs, resolveToDistFile, classifyExternalFailure } from '../src/lib/linkcheck';

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
describe('classifyExternalFailure', () => {
  it('treats an incomplete certificate chain as a legacy-TLS warning', () => {
    expect(classifyExternalFailure('UNABLE_TO_GET_ISSUER_CERT_LOCALLY')).toBe('legacy-tls-warn');
  });
  it('treats unsafe legacy renegotiation as a legacy-TLS warning', () => {
    expect(classifyExternalFailure('ERR_SSL_UNSAFE_LEGACY_RENEGOTIATION_DISABLED')).toBe('legacy-tls-warn');
  });
  it('still fails on other TLS errors like an expired certificate', () => {
    expect(classifyExternalFailure('CERT_HAS_EXPIRED')).toBe('fail');
  });
});
