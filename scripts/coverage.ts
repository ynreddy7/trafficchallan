/**
 * Coverage check — does a queue item marked "covered" actually say the words?
 *
 * The keyword queue drives everything the scheduled runs build. An item marked
 * `covered` is never produced again, so a wrong `covered_by` is silent: the
 * routine skips it forever AND the phrase appears nowhere on the site. That is
 * exactly how a 50-keyword competitor-gap list built up unnoticed while the
 * queue claimed the ground was held.
 *
 * This resolves each covered item to its page in dist/ and asserts the target
 * keyword really is in the rendered text. Run after `npm run build`.
 *
 * Matching is on DISTINCTIVE terms, not the literal phrase. "traffic challan
 * photo" is satisfied by a page that says "challan details, photo and status" —
 * searchers type phrases, pages write sentences, and demanding the exact string
 * would flag most of the site while hiding the gaps that matter. So the head
 * terms every page carries (traffic, challan, e-challan, online, india…) are
 * dropped, common misspellings are folded to their canonical form, and what
 * remains — photo, token, waiver, history — must actually be on the page.
 * A keyword that is nothing but head terms needs no check: the page it is
 * claimed by is about challans by definition.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface QueueItem {
  slug_suggestion: string;
  target_keyword: string;
  cluster_keywords?: string[];
  status: string;
  covered_by?: string;
}

const DIST = 'dist';

/** Flatten punctuation/case so hyphen and spacing variants compare equal. */
export function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Head terms carried by every page on a challan site, plus URL debris from
 * pasted-address queries. A keyword made only of these is covered by
 * definition, so requiring them proves nothing.
 */
const HEAD_TERMS = new Set([
  'traffic', 'challan', 'challans', 'echallan', 'chalan', 'e', 'online',
  'india', 'indian', 'the', 'of', 'in', 'for', 'my', 'a', 'an', 'is', 'to',
  'and', 'com', 'gov', 'www', 'http', 'https', 'ttps', 'nic', 'net'
]);

/** Misspellings searchers type that a page must never reproduce. */
const CANONICAL: Record<string, string> = {
  echalan: 'echallan', chalan: 'challan', echal: 'echallan',
  challans: 'challan', echallans: 'echallan'
};

/**
 * The terms that actually distinguish a keyword. Empty means the keyword is
 * pure head terms and needs no evidence.
 */
export function distinctiveTerms(keyword: string): string[] {
  // Searchers also split the word mid-way ("echal lan parivahan"). Rejoin the
  // known splits first, or the orphan fragment reads as a distinctive term the
  // page could only satisfy by reproducing the typo.
  const joined = normalise(keyword)
    .replace(/echal lan/g, 'echallan')
    .replace(/e chal lan/g, 'echallan')
    .replace(/cha llan/g, 'challan');
  const tokens = joined.split(' ').filter(Boolean).map((t) => CANONICAL[t] ?? t);
  return [...new Set(tokens.filter((t) => !HEAD_TERMS.has(t)))];
}

/** Visible text of a built page, with tags, scripts and styles stripped. */
export function pageText(html: string): string {
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return normalise(stripped);
}

/**
 * Candidate dist paths for a covered_by value. The queue records it loosely —
 * a page slug, "homepage", "fines-index" — so try the shapes that exist rather
 * than demanding the queue be rewritten.
 */
export function candidatePaths(coveredBy: string): string[] {
  const v = coveredBy.trim();
  if (/^homepage$/i.test(v)) return ['index.html'];
  if (/^fines[- ]index$/i.test(v)) return [join('fines', 'index.html')];
  const slug = v.replace(/^\//, '').replace(/\/$/, '');
  return [
    join(slug, 'index.html'),
    join('fines', slug, 'index.html'),
    join('rto-codes', slug, 'index.html')
  ];
}

/** covered_by values that are prose explanations, not page references. */
export function isProse(coveredBy: string): boolean {
  return /\s/.test(coveredBy.trim()) && !/^fines[- ]index$/i.test(coveredBy.trim());
}

function main() {
  if (!existsSync(DIST)) {
    console.error('coverage: no dist/ — run `npm run build` first.');
    process.exit(1);
  }
  const queue = JSON.parse(readFileSync(join('data', 'keywords', 'queue.json'), 'utf-8'));
  const items: QueueItem[] = queue.items;

  const missing: { slug: string; keyword: string; page: string; absent: string[] }[] = [];
  const unresolved: { slug: string; coveredBy: string }[] = [];
  const prose: string[] = [];
  let checked = 0;

  for (const it of items) {
    if (it.status !== 'covered' && it.status !== 'done') continue;
    const by = it.covered_by;
    if (!by) continue;
    if (isProse(by)) { prose.push(it.slug_suggestion); continue; }

    const found = candidatePaths(by).map((p) => join(DIST, p)).find((p) => existsSync(p));
    if (!found) { unresolved.push({ slug: it.slug_suggestion, coveredBy: by }); continue; }

    const text = pageText(readFileSync(found, 'utf-8'));
    checked++;
    const terms = distinctiveTerms(it.target_keyword);
    const absent = terms.filter((t) => !new RegExp(`(^| )${t}`).test(text));
    if (absent.length) {
      missing.push({ slug: it.slug_suggestion, keyword: it.target_keyword, page: by, absent });
    }
  }

  console.log(`coverage: ${checked} covered item(s) checked against built pages.`);
  if (prose.length) console.log(`coverage: ${prose.length} item(s) have an explanatory covered_by, not a page — skipped.`);

  if (unresolved.length) {
    console.log(`\ncoverage: ${unresolved.length} covered_by value(s) match no built page:`);
    for (const u of unresolved) console.log(`  ${u.slug} -> "${u.coveredBy}"`);
  }

  if (missing.length) {
    console.log(`\nCOVERAGE GAPS: ${missing.length} item(s) marked covered whose keyword is NOT on the page.`);
    console.log('Each one is a keyword the site claims to hold and does not — the routine will never');
    console.log('build it, so fix the page phrasing or set the item back to pending.\n');
    for (const m of missing) console.log(`  "${m.keyword}"  claimed by  ${m.page}  — missing: ${m.absent.join(', ')}`);
  } else {
    console.log('coverage: every covered keyword appears on its page.');
  }
  // Reporting tool, not a gate: it must never block a content run.
  process.exit(0);
}

const invokedDirectly = process.argv[1] && /coverage\.ts$/.test(process.argv[1]);
if (invokedDirectly) main();
