import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const TRUST_PAGE_DATE = '2026-08-13';

/**
 * Builds a URL-pathname -> last_verified date map at config-load time, read
 * straight from the source data (no build step dependency), for the
 * sitemap's <lastmod> serializer. States and fines each own their page's
 * date; guides come from frontmatter via gray-matter (Astro's content
 * collections aren't available in astro.config.mjs); the four data-summary
 * pages (/, /fines/, /calculator/, /compare/) get the max date across all
 * sources (states + fines + guides + schemes + lok-adalat, mirroring
 * src/lib/data.ts newestVerifiedDate() — change both together; RTO files
 * are deliberately excluded there and here); /challan-discount/ gets the
 * max across schemes + lok-adalat only (mirroring data.ts maxSchemeDate());
 * trust pages get the fixed site-launch date. Anything not in the map is
 * left without a lastmod by the caller.
 */
function buildLastmodMap() {
  const map = new Map();
  const allDates = [];

  const statesDir = join(process.cwd(), 'data', 'states');
  for (const file of readdirSync(statesDir).filter((f) => f.endsWith('.json'))) {
    const rec = JSON.parse(readFileSync(join(statesDir, file), 'utf-8'));
    if (rec.slug && rec.last_verified) {
      map.set(`/${rec.slug}-e-challan/`, rec.last_verified);
      allDates.push(rec.last_verified);
    }
  }

  const finesDir = join(process.cwd(), 'data', 'fines');
  for (const file of readdirSync(finesDir).filter((f) => f.endsWith('.json'))) {
    const rec = JSON.parse(readFileSync(join(finesDir, file), 'utf-8'));
    if (rec.slug && rec.last_verified) {
      map.set(`/fines/${rec.slug}/`, rec.last_verified);
      allDates.push(rec.last_verified);
    }
  }

  const guidesDir = join(process.cwd(), 'src', 'content', 'guides');
  for (const file of readdirSync(guidesDir).filter((f) => f.endsWith('.md'))) {
    const { data } = matter(readFileSync(join(guidesDir, file), 'utf-8'));
    const id = file.replace(/\.md$/, '');
    if (data.last_verified) {
      map.set(`/${id}/`, data.last_verified);
      allDates.push(data.last_verified);
    }
  }

  // Schemes + lok-adalat: their max is /challan-discount/'s own lastmod
  // (mirrors data.ts maxSchemeDate()), and the same dates join the global
  // max (mirrors data.ts newestVerifiedDate() — change both together).
  const schemeDates = [];
  const schemesDir = join(process.cwd(), 'data', 'schemes');
  for (const file of readdirSync(schemesDir).filter((f) => f.endsWith('.json'))) {
    const rec = JSON.parse(readFileSync(join(schemesDir, file), 'utf-8'));
    if (rec.last_verified) schemeDates.push(rec.last_verified);
  }
  const lokAdalat = JSON.parse(readFileSync(join(process.cwd(), 'data', 'lok-adalat.json'), 'utf-8'));
  if (lokAdalat.last_verified) schemeDates.push(lokAdalat.last_verified);
  const schemeMax = [...schemeDates].sort().at(-1);
  if (schemeMax) map.set('/challan-discount/', schemeMax);
  allDates.push(...schemeDates);

  const newest = allDates.sort().at(-1);
  if (newest) {
    for (const path of ['/', '/fines/', '/calculator/', '/compare/']) map.set(path, newest);
  }
  for (const path of ['/about/', '/editorial-policy/', '/contact/', '/privacy/']) {
    map.set(path, TRUST_PAGE_DATE);
  }

  return map;
}

const lastmodMap = buildLastmodMap();

export default defineConfig({
  site: 'https://trafficchallan.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const lastmod = lastmodMap.get(pathname);
        return lastmod ? { ...item, lastmod } : item;
      }
    })
  ],
  markdown: {
    rehypePlugins: [rehypeSlug]
  }
});
