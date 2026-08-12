export function extractLocalHrefs(html: string): string[] {
  const hrefs = new Set<string>();
  for (const m of html.matchAll(/href="([^"#]+)"/g)) {
    const h = m[1];
    if (h.startsWith('/')) hrefs.add(h);
  }
  return [...hrefs];
}
export function extractExternalHrefs(html: string): string[] {
  const hrefs = new Set<string>();
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    if (!m[1].startsWith('https://trafficchallan.com')) hrefs.add(m[1]);
  }
  return [...hrefs];
}
export function resolveToDistFile(href: string): string {
  const clean = href.split('?')[0];
  if (/\.[a-z0-9]+$/i.test(clean)) return 'dist' + clean;
  return 'dist' + clean.replace(/\/?$/, '/') + 'index.html';
}

const LEGACY_TLS_CODES = new Set(['UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'ERR_SSL_UNSAFE_LEGACY_RENEGOTIATION_DISABLED']);

/**
 * Classifies a Node TLS/network error code from a failed external-link fetch.
 * Some legacy gov.in servers respond, but with a TLS handshake modern Node
 * rejects (incomplete cert chain, unsafe legacy renegotiation) while curl and
 * browsers load them fine — those are warnings, not dead links. Every other
 * TLS error (expired cert, hostname mismatch, etc.) still fails the check.
 */
export function classifyExternalFailure(code: string): 'legacy-tls-warn' | 'fail' {
  return LEGACY_TLS_CODES.has(code) ? 'legacy-tls-warn' : 'fail';
}
