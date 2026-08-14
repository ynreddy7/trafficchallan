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
 * sources (states + fines + guides + schemes + lok-adalat +
 * challan-statuses + official-portals, mirroring src/lib/data.ts
 * newestVerifiedDate() — change both together; RTO files are deliberately
 * excluded there and here); per-state fine-list pages (/fines/{state}/,
 * built for every state with a non-empty fine_overrides, mirroring
 * src/lib/fine-list.ts hasFineListPage()) get
 * max(state date, newest fine date), mirroring data.ts fineListDate() —
 * change both together; /challan-discount/ gets the max across
 * schemes + lok-adalat only (mirroring data.ts maxSchemeDate());
 * /challan-status/ gets the challan-statuses.json date, which also joins
 * the global max; /fake-challan-sms/ gets the official-portals.json date,
 * which also joins the global max;
 * each per-state RTO hub (/rto-codes/{state}/, one per data/rto/ file,
 * mirroring src/pages/rto-codes/[state].astro) gets its own file's date,
 * and /rto-codes/ (the lookup index) gets the max across data/rto/ files
 * (RTO dates never join the global max — slow-moving directory data must
 * not bump site-wide freshness); trust pages get the fixed site-launch
 * date.
 * Anything not in the map is left without a lastmod by the caller.
 */
function buildLastmodMap() {
  const map = new Map();
  const allDates = [];

  // States with a non-empty fine_overrides also own a /fines/{state}/ list
  // page (mirrors src/lib/fine-list.ts hasFineListPage()); its lastmod is
  // computed after the fines loop below, once the newest fine date is known.
  const fineListStates = [];
  const statesDir = join(process.cwd(), 'data', 'states');
  for (const file of readdirSync(statesDir).filter((f) => f.endsWith('.json'))) {
    const rec = JSON.parse(readFileSync(join(statesDir, file), 'utf-8'));
    if (rec.slug && rec.last_verified) {
      map.set(`/${rec.slug}-e-challan/`, rec.last_verified);
      allDates.push(rec.last_verified);
      if (Object.keys(rec.fine_overrides ?? {}).length > 0) fineListStates.push(rec);
    }
  }

  const fineDates = [];
  const finesDir = join(process.cwd(), 'data', 'fines');
  for (const file of readdirSync(finesDir).filter((f) => f.endsWith('.json'))) {
    const rec = JSON.parse(readFileSync(join(finesDir, file), 'utf-8'));
    if (rec.slug && rec.last_verified) {
      map.set(`/fines/${rec.slug}/`, rec.last_verified);
      allDates.push(rec.last_verified);
      fineDates.push(rec.last_verified);
    }
  }

  // Per-state fine-list pages: max(state date, newest fine date) — the list
  // renders every offence, so a re-verified fine file freshens it (mirrors
  // src/lib/data.ts fineListDate(), which the page uses for its dateModified
  // — change both together; the dates already joined allDates above).
  const finesMax = [...fineDates].sort().at(-1);
  for (const rec of fineListStates) {
    map.set(`/fines/${rec.slug}/`, [rec.last_verified, finesMax].filter(Boolean).sort().at(-1));
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

  // Challan-status decoder: its file's date is /challan-status/'s lastmod
  // AND joins the global max (mirrors data.ts newestVerifiedDate(), which
  // includes loadStatusFile().last_verified — change both together).
  const statusFile = JSON.parse(readFileSync(join(process.cwd(), 'data', 'challan-statuses.json'), 'utf-8'));
  if (statusFile.last_verified) {
    map.set('/challan-status/', statusFile.last_verified);
    allDates.push(statusFile.last_verified);
  }

  // Official-portals allow-list: its file's date is /fake-challan-sms/'s
  // lastmod AND joins the global max (mirrors data.ts newestVerifiedDate(),
  // which includes loadOfficialPortals().last_verified — change both
  // together).
  const portalsFile = JSON.parse(readFileSync(join(process.cwd(), 'data', 'official-portals.json'), 'utf-8'));
  if (portalsFile.last_verified) {
    map.set('/fake-challan-sms/', portalsFile.last_verified);
    allDates.push(portalsFile.last_verified);
  }

  // RTO directory files: each file's date is its own hub page's
  // (/rto-codes/{state}/) lastmod — mirroring the dateModified prop in
  // src/pages/rto-codes/[state].astro — and their max is /rto-codes/'s (the
  // lookup index). Deliberately NOT pushed into allDates (mirrors data.ts,
  // where newestVerifiedDate() excludes RTO files by design).
  const rtoDates = [];
  const rtoDir = join(process.cwd(), 'data', 'rto');
  for (const file of readdirSync(rtoDir).filter((f) => f.endsWith('.json'))) {
    const rec = JSON.parse(readFileSync(join(rtoDir, file), 'utf-8'));
    if (rec.slug && rec.last_verified) {
      map.set(`/rto-codes/${rec.slug}/`, rec.last_verified);
      rtoDates.push(rec.last_verified);
    }
  }
  const rtoMax = [...rtoDates].sort().at(-1);
  if (rtoMax) map.set('/rto-codes/', rtoMax);

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
    rehypePlugins: [rehypeSlug, rehypeWrapTables]
  }
});

/**
 * Wraps every markdown-generated <table> in <div class="table-wrap"> so wide
 * tables scroll inside their own container instead of widening the page on
 * phones — the same idiom the .astro templates use, keeping real table
 * semantics for assistive tech (no display:block hack).
 */
function rehypeWrapTables() {
  const wrap = (node) => {
    if (!node.children) return;
    node.children = node.children.map((child) => {
      if (child.type === 'element' && child.tagName === 'table') {
        return { type: 'element', tagName: 'div', properties: { className: ['table-wrap'] }, children: [child] };
      }
      wrap(child);
      return child;
    });
  };
  return wrap;
}
