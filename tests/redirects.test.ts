import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import fg from 'fast-glob';
import { parseRedirects, checkRedirects, isDynamic, MAX_STATIC_RULES, MAX_TOTAL_RULES, MAX_LINE_LENGTH } from '../src/lib/redirects';
import { loadStates, loadOffences, loadRtoFiles } from '../src/lib/data';
import { hasFineListPage } from '../src/lib/fine-list';

/**
 * Every URL pathname this repo builds, derived from the same loaders and
 * directories the pages route from (src/pages/**, plus the data-driven
 * getStaticPaths sources). Used as the authority for "does this redirect
 * target exist" — see the sitemap cross-check below, which proves the
 * derivation matches a real build whenever dist/ is present.
 */
function builtPaths(): Set<string> {
  const paths = new Set<string>(['/']);

  // Static routes: src/pages/**/*.astro without a [param] in the filename.
  for (const file of fg.sync('**/*.astro', { cwd: join(process.cwd(), 'src', 'pages') })) {
    if (file.includes('[')) continue;
    const route = file.replace(/\.astro$/, '');
    if (route === '404') continue;
    paths.add(route === 'index' ? '/' : '/' + route.replace(/\/index$/, '') + '/');
  }
  // Endpoint routes: src/pages/**/*.ts keep their extension (/api/fines.json).
  for (const file of fg.sync('**/*.ts', { cwd: join(process.cwd(), 'src', 'pages') })) {
    if (file.includes('[')) continue;
    paths.add('/' + file.replace(/\.ts$/, ''));
  }

  // src/pages/[slug].astro: one page per state and per guide.
  for (const state of loadStates()) paths.add(`/${state.slug}-e-challan/`);
  for (const file of fg.sync('*.md', { cwd: join(process.cwd(), 'src', 'content', 'guides') })) {
    paths.add('/' + file.replace(/\.md$/, '') + '/');
  }
  // src/pages/fines/[slug].astro: one per offence, plus the per-state lists.
  for (const offence of loadOffences()) paths.add(`/fines/${offence.slug}/`);
  for (const state of loadStates()) if (hasFineListPage(state)) paths.add(`/fines/${state.slug}/`);
  // src/pages/rto-codes/[state].astro: one hub per data/rto/ file.
  for (const rto of loadRtoFiles()) paths.add(`/rto-codes/${rto.slug}/`);

  return paths;
}

const REDIRECTS_FILE = join(process.cwd(), 'public', '_redirects');

describe('parseRedirects', () => {
  it('skips blank lines and # comments, and defaults the status to 302 like Cloudflare', () => {
    const rules = parseRedirects('# a comment\n\n/old /new 301\n/other /elsewhere\n');
    expect(rules).toHaveLength(2);
    expect(rules[0]).toMatchObject({ source: '/old', destination: '/new', status: 301, line: 3 });
    expect(rules[1]).toMatchObject({ source: '/other', destination: '/elsewhere', status: 302, line: 4 });
  });
  it('tolerates extra whitespace between the fields', () => {
    expect(parseRedirects('  /old    /new   301  ')[0]).toMatchObject({ source: '/old', destination: '/new', status: 301 });
  });
});

describe('isDynamic', () => {
  const rule = (source: string) => ({ source, destination: '/x/', status: 301, line: 1, raw: '' });
  it('flags splats and placeholders', () => {
    expect(isDynamic(rule('/tag/*'))).toBe(true);
    expect(isDynamic(rule('/tag/:name/'))).toBe(true);
  });
  it('leaves exact paths alone', () => {
    expect(isDynamic(rule('/tag/traffic-rules/'))).toBe(false);
  });
});

describe('checkRedirects', () => {
  const known = new Set(['/fines/', '/about/']);
  const parse1 = (line: string) => parseRedirects(line);

  it('accepts an exact 301 to a page that exists', () => {
    expect(checkRedirects(parse1('/tag/traffic-rules/ /fines/ 301'), known)).toEqual([]);
  });
  it('rejects a destination that is not a built page — that is a redirect to a 404', () => {
    expect(checkRedirects(parse1('/tag/x/ /nope/ 301'), known).join()).toMatch(/not a page this site builds/);
  });
  it('rejects a source that collides with a live page (Cloudflare follows redirects over assets)', () => {
    expect(checkRedirects(parse1('/about/ /fines/ 301'), known).join()).toMatch(/would shadow it/);
  });
  it('rejects anything that is not a 301', () => {
    expect(checkRedirects(parse1('/tag/x/ /fines/ 302'), known).join()).toMatch(/permanent move/);
    expect(checkRedirects(parse1('/tag/x/ /fines/'), known).join()).toMatch(/permanent move/);
  });
  it('rejects splats and placeholders', () => {
    expect(checkRedirects(parse1('/tag/* /fines/ 301'), known).join()).toMatch(/exact rules only/);
  });
  it('rejects a query string in the source — Cloudflare cannot match those', () => {
    expect(checkRedirects(parse1('/?p=123 /fines/ 301'), known).join()).toMatch(/query string/);
  });
  it('rejects a duplicate source — Cloudflare would silently apply the top-most rule', () => {
    const out = checkRedirects(parseRedirects('/tag/x/ /fines/ 301\n/tag/x/ /about/ 301'), known);
    expect(out.join()).toMatch(/already declared on line 1/);
  });
  it('rejects a self-redirect', () => {
    expect(checkRedirects(parse1('/fines/ /fines/ 301'), known).join()).toMatch(/infinite redirect/);
  });
  it('rejects a relative or off-site destination', () => {
    expect(checkRedirects(parse1('/tag/x/ https://example.com/ 301'), known).join()).toMatch(/root-relative path on this site/);
  });
  it('rejects a line over Cloudflare 1,000-character limit', () => {
    const long = '/tag/' + 'a'.repeat(1000) + '/ /fines/ 301';
    expect(checkRedirects(parse1(long), known).join()).toMatch(/Cloudflare's limit is 1000/);
  });
  it('rejects more static rules than Cloudflare allows', () => {
    const many = Array.from({ length: MAX_STATIC_RULES + 1 }, (_, i) => `/tag/x${i}/ /fines/ 301`).join('\n');
    expect(checkRedirects(parseRedirects(many), known).join()).toMatch(/static rules/);
  });
});

describe('public/_redirects (the real file)', () => {
  const text = readFileSync(REDIRECTS_FILE, 'utf-8');
  const rules = parseRedirects(text);
  const paths = builtPaths();

  it('passes every syntax, limit and safety check', () => {
    expect(checkRedirects(rules, paths)).toEqual([]);
  });

  it('every destination resolves to a page this repo builds', () => {
    // The whole point of the file: a redirect to a 404 is worse than no
    // redirect. Named individually so a failure says which line to fix.
    for (const rule of rules) {
      expect(paths.has(rule.destination), `line ${rule.line}: ${rule.source} -> ${rule.destination} is not a built page`).toBe(true);
    }
  });

  it('never redirects a path this site serves itself', () => {
    for (const rule of rules) {
      expect(paths.has(rule.source), `line ${rule.line}: ${rule.source} is a live page — the redirect would shadow it`).toBe(false);
    }
  });

  it('carries only exact static rules, well inside Cloudflare limits', () => {
    expect(rules.filter(isDynamic)).toEqual([]);
    expect(rules.length).toBeLessThanOrEqual(MAX_STATIC_RULES);
    expect(rules.length).toBeLessThanOrEqual(MAX_TOTAL_RULES);
    expect(Math.max(...rules.map((r) => r.raw.length))).toBeLessThanOrEqual(MAX_LINE_LENGTH);
  });

  it('redirects nothing off-topic to a challan page', () => {
    // The old site was two-thirds exam-results and celebrity-finance churn.
    // Redirecting those here is the expired-domain topic flip Google's spam
    // policy targets, so no source may carry one of their marker terms.
    const offTopic = /(ugc-net|kset|dsssb|ap-tet|ap-dsc|recruitment|syllabus|result|sarkari|net-worth|income|ipo|toll|linguistic|rights|samachar|news)/i;
    for (const rule of rules) {
      expect(offTopic.test(rule.source), `line ${rule.line}: ${rule.source} looks off-topic for ${rule.destination}`).toBe(false);
    }
  });

  it('states the measured link-equity finding so nobody over-invests here', () => {
    expect(text).toMatch(/HOW MUCH IS AT STAKE: ESSENTIALLY NOTHING/);
    expect(text).toMatch(/developers\.cloudflare\.com\/pages\/configuration\/redirects/);
    expect(text).toMatch(/soft 404 error/);
  });
});

describe('built pathname derivation', () => {
  it('matches the sitemap of a real build when one is present', () => {
    // dist/ is gitignored, so this can only run after `npm run build` — but
    // when it does, it proves builtPaths() above is not drifting from what
    // Astro actually emits, which is what the redirect targets are checked
    // against.
    const sitemap = join(process.cwd(), 'dist', 'sitemap-0.xml');
    if (!existsSync(sitemap)) return;
    const urls = [...readFileSync(sitemap, 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1].replace(/^https:\/\/trafficchallan\.com/, ''));
    expect(urls.length).toBeGreaterThan(0);
    const derived = builtPaths();
    const missing = urls.filter((u) => !derived.has(u));
    expect(missing, 'sitemap URLs that builtPaths() failed to derive').toEqual([]);
  });
});
