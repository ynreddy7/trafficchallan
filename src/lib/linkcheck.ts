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
