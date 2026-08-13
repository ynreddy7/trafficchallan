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
const DNS_DEAD_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN']);

/**
 * Classifies a Node TLS/network error code from a failed external-link fetch.
 *
 * Only DNS resolution failure is treated as dead: a host that no longer
 * resolves after retries is gone. Every connection-level failure on a host
 * that DOES resolve (timeouts, resets, TLS quirks) is a warning, not a dead
 * link — NIC/gov.in servers are routinely too slow for any sane timeout
 * (nalsa.gov.in has been observed still streaming its page at 20s) and reject
 * modern TLS handshakes that curl and browsers accept. Warnings stay loud in
 * the report; the monthly verification run reviews them by hand.
 */
export function classifyExternalFailure(code: string): 'legacy-tls-warn' | 'dns-dead' | 'net-warn' {
  if (DNS_DEAD_CODES.has(code)) return 'dns-dead';
  return LEGACY_TLS_CODES.has(code) ? 'legacy-tls-warn' : 'net-warn';
}

/**
 * Classifies a non-2xx/3xx HTTP status. Only 404/410 are dead — the server
 * affirmatively says the page is gone. Anything else (401/403/429, 5xx) means
 * the server is alive but refusing or failing this particular request — gov
 * portals routinely 500 on bot-shaped GETs while working fine in browsers.
 */
export function classifyExternalStatus(status: number): 'dead' | 'warn' {
  return status === 404 || status === 410 ? 'dead' : 'warn';
}
