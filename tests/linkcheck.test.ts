import { describe, it, expect } from 'vitest';
import { extractLocalHrefs, resolveToDistFile, classifyExternalFailure, classifyExternalStatus } from '../src/lib/linkcheck';

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
  it('treats a host that no longer resolves as dead', () => {
    expect(classifyExternalFailure('ENOTFOUND')).toBe('dns-dead');
    expect(classifyExternalFailure('EAI_AGAIN')).toBe('dns-dead');
  });
  it('treats other connection-level failures as warnings (NIC infra is slow/flaky)', () => {
    expect(classifyExternalFailure('CERT_HAS_EXPIRED')).toBe('net-warn');
    expect(classifyExternalFailure('ECONNRESET')).toBe('net-warn');
    expect(classifyExternalFailure('UND_ERR_CONNECT_TIMEOUT')).toBe('net-warn');
  });
});
describe('classifyExternalStatus', () => {
  it('treats an affirmative gone (404/410) as dead', () => {
    expect(classifyExternalStatus(404)).toBe('dead');
    expect(classifyExternalStatus(410)).toBe('dead');
  });
  it('treats other error statuses as warnings — the server is alive', () => {
    expect(classifyExternalStatus(500)).toBe('warn');
    expect(classifyExternalStatus(429)).toBe('warn');
    expect(classifyExternalStatus(401)).toBe('warn');
  });
});
