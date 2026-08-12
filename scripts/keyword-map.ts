import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import XLSX from 'xlsx';
import { loadStates, loadOffences } from '../src/lib/data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnownPage {
  slug: string;
  target_keyword: string;
  type: string;
}

export interface KeywordRow {
  keyword: string;
  volume: number;
}

export interface KeywordMap {
  assigned: Record<string, KeywordRow[]>;
  unassigned: KeywordRow[];
}

export interface QueueItem {
  slug_suggestion: string;
  target_keyword: string;
  cluster_keywords: string[];
  est_volume: number;
  max_cpc: number;
  min_seo_difficulty: number;
  type: 'guide' | 'state' | 'offence';
  status: 'pending';
}

// ---------------------------------------------------------------------------
// Tokenizing / matching helpers
// ---------------------------------------------------------------------------

// True linguistic stopwords plus the single-letter "e" (as in "e challan").
const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'to', 'for', 'is', 'are', 'and', 'or',
  'with', 'without', 'my', 'how', 'what', 'when', 'do', 'does', 'did', 'i', 'e'
]);

// Domain filler that is present in almost every keyword in this corpus
// ("challan", "traffic", "fine" ...). Stripping it out is what turns a raw
// keyword into its distinguishing topic words - used for deriving a state
// page's own name token (fallback path) and for building cluster keys.
const DOMAIN_FILLER = new Set([...STOPWORDS, 'challan', 'challans', 'traffic', 'fine', 'fines']);

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

function significantTokens(text: string, filler: Set<string>): string[] {
  // De-duped: a repeated word inside one target_keyword (e.g. "challan"
  // appearing twice in "court challan vs on spot challan") must not count
  // twice toward the overlap score below.
  return [...new Set(normalize(text).filter((t) => t.length > 2 && !filler.has(t)))];
}

// The token(s) that identify a state page, independent of how its
// target_keyword happens to phrase the search term (which sometimes uses an
// abbreviation, e.g. Telangana's own target_keyword is "e challan ts" - that
// mismatch is intentional; see task brief Step 3, hand-fixed after review).
function stateNameTokens(page: KnownPage): string[] {
  const base = page.slug.endsWith('-e-challan') ? page.slug.slice(0, -'-e-challan'.length) : page.slug;
  const fromSlug = base.split(/[-/]/).filter((t) => t.length > 2 && !STOPWORDS.has(t));
  if (fromSlug.length) return fromSlug;
  return significantTokens(page.target_keyword, DOMAIN_FILLER);
}

// Score a keyword against a single known page. 0 means "no match".
function scorePage(keywordTokens: string[], page: KnownPage): number {
  if (page.type === 'state') {
    const nameTokens = stateNameTokens(page);
    if (nameTokens.length === 0) return 0;
    const allPresent = nameTokens.every((t) => keywordTokens.includes(t));
    return allPresent ? nameTokens.length : 0;
  }
  const sig = significantTokens(page.target_keyword, STOPWORDS);
  const overlap = sig.filter((t) => keywordTokens.includes(t)).length;
  return overlap >= 2 ? overlap : 0;
}

// ---------------------------------------------------------------------------
// mapKeywords - the pure mapper, no I/O
// ---------------------------------------------------------------------------

export function mapKeywords(rows: KeywordRow[], known: KnownPage[]): KeywordMap {
  const assigned: Record<string, KeywordRow[]> = {};
  const unassigned: KeywordRow[] = [];

  for (const row of rows) {
    const keywordTokens = normalize(row.keyword);
    let bestPage: KnownPage | null = null;
    let bestScore = 0;
    for (const page of known) {
      const score = scorePage(keywordTokens, page);
      if (score > bestScore) {
        bestScore = score;
        bestPage = page;
      }
    }
    if (bestPage) {
      (assigned[bestPage.slug] ??= []).push(row);
    } else {
      unassigned.push(row);
    }
  }

  return { assigned, unassigned };
}

// ---------------------------------------------------------------------------
// CLI (guarded so importing this module for tests has no side effects)
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// The six guide slugs already fixed by the content plan (Task 21 territory)
// even though the files don't exist yet - included so their keywords get
// claimed now instead of spawning duplicate queue entries later.
const PLANNED_GUIDES: KnownPage[] = [
  { slug: 'how-to-check-e-challan', target_keyword: 'how to check e challan', type: 'guide' },
  { slug: 'how-to-pay-e-challan-online', target_keyword: 'how to pay e challan online', type: 'guide' },
  { slug: 'unpaid-e-challan-consequences', target_keyword: 'what happens if e challan is not paid', type: 'guide' },
  { slug: 'wrong-e-challan-dispute', target_keyword: 'wrong challan complaint', type: 'guide' },
  { slug: 'e-challan-lok-adalat', target_keyword: 'e challan lok adalat', type: 'guide' },
  { slug: 'court-challan-vs-on-spot-challan', target_keyword: 'court challan vs on spot challan', type: 'guide' }
];

// NOTE: the nine states that used to be hardcoded here as PLANNED_STATES
// (uttar-pradesh, karnataka, tamil-nadu, andhra-pradesh, haryana, rajasthan,
// gujarat, west-bengal, madhya-pradesh) landed for real in data/states/ as of
// commit 492cf5b, so loadStates() below now covers them directly - with the
// correct `${slug}-e-challan` known-page key, consistent with every other
// state. Keeping a separate hardcoded list would have re-introduced the
// bare-slug-vs-"-e-challan"-suffix inconsistency this comment used to warn
// about, so it was removed rather than updated.

// Genuine Indian state/UT names (and their common short forms) only - city
// names are deliberately excluded so a city-level search (e.g. "traffic
// challan mumbai") is not mistagged as a candidate new *state* page.
const STATE_HINTS = [
  'delhi', 'maharashtra', 'telangana', 'karnataka', 'tamil nadu', 'andhra pradesh',
  'uttar pradesh', 'haryana', 'rajasthan', 'gujarat', 'west bengal', 'madhya pradesh',
  'bihar', 'punjab', 'kerala', 'odisha', 'assam', 'jharkhand', 'chhattisgarh',
  'uttarakhand', 'himachal', 'goa', 'tripura', 'manipur', 'meghalaya', 'nagaland',
  'mizoram', 'sikkim', 'arunachal', 'jammu', 'kashmir', 'chandigarh', 'puducherry',
  'up', 'mp', 'tn', 'ap', 'ts', 'jk', 'wb'
];

const OFFENCE_HINTS = [
  'no parking', 'triple riding', 'wrong side', 'signal jump', 'red light',
  'without helmet', 'helmet', 'without seatbelt', 'seat belt', 'drunk', 'overspeed',
  'over speed', 'mobile phone', 'no insurance', 'no license', 'no licence',
  'no puc', 'no rc', 'number plate', 'tinted glass', 'pollution',
  'fitness certificate', 'triple seat', 'zebra crossing', 'wrong parking'
];

function guessType(text: string): 'guide' | 'state' | 'offence' {
  const lower = ` ${text.toLowerCase()} `;
  if (STATE_HINTS.some((h) => lower.includes(` ${h} `))) return 'state';
  if (OFFENCE_HINTS.some((h) => lower.includes(h))) return 'offence';
  return 'guide';
}

function loadGuideKnownPages(): KnownPage[] {
  const dir = join(process.cwd(), 'src', 'content', 'guides');
  if (!existsSync(dir)) return [];
  return fg
    .sync('*.md', { cwd: dir })
    .map((file) => {
      const fm = matter(readFileSync(join(dir, file), 'utf-8')).data;
      return { slug: basename(file, '.md'), target_keyword: String(fm.target_keyword ?? ''), type: 'guide' };
    })
    .filter((g) => g.target_keyword.length > 0);
}

function buildKnownPages(): KnownPage[] {
  const states = loadStates().map((s) => ({ slug: `${s.slug}-e-challan`, target_keyword: s.target_keyword, type: 'state' }));
  const offences = loadOffences().map((o) => ({ slug: `fines/${o.slug}`, target_keyword: o.target_keyword, type: 'offence' }));
  const guides = loadGuideKnownPages();
  return [...states, ...offences, ...guides, ...PLANNED_GUIDES];
}

interface RawRow {
  keyword: string;
  volume: number;
  cpc: number;
  seo_difficulty: number;
}

function readExportCsv(path: string): RawRow[] {
  const wb = XLSX.readFile(path);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!rows.length) return [];

  const headerKeys = Object.keys(rows[0]);
  const findKey = (name: string) => headerKeys.find((k) => k.trim().toLowerCase() === name);
  const keywordKey = findKey('keyword');
  const volumeKey = findKey('volume');
  const cpcKey = findKey('cpc');
  const seoKey = findKey('seo difficulty');
  if (!keywordKey || !volumeKey) {
    throw new Error(`Could not find keyword/volume columns in export. Columns found: ${headerKeys.join(', ')}`);
  }

  return rows
    .map((r) => ({
      keyword: String(r[keywordKey] ?? '').trim(),
      volume: Number(r[volumeKey]) || 0,
      cpc: cpcKey ? Number(r[cpcKey]) || 0 : 0,
      seo_difficulty: seoKey ? Number(r[seoKey]) || 0 : 0
    }))
    .filter((r) => r.keyword.length > 0);
}

function buildQueue(unassigned: KeywordRow[], rawByKeyword: Map<string, RawRow>): QueueItem[] {
  const groups = new Map<string, { keywords: string[]; volume: number }>();

  for (const row of unassigned) {
    const sig = significantTokens(row.keyword, DOMAIN_FILLER);
    const bigramSource = sig.length > 0 ? sig : normalize(row.keyword);
    const groupKey = bigramSource.slice(0, 2).join(' ') || row.keyword.toLowerCase();
    const g = groups.get(groupKey) ?? { keywords: [], volume: 0 };
    g.keywords.push(row.keyword);
    g.volume += row.volume;
    groups.set(groupKey, g);
  }

  const items: QueueItem[] = [];
  for (const [groupKey, g] of groups) {
    const rawRows = g.keywords.map((k) => rawByKeyword.get(k.toLowerCase())).filter((r): r is RawRow => !!r);
    const maxCpc = rawRows.length ? Math.max(...rawRows.map((r) => r.cpc)) : 0;
    const minSeoDifficulty = rawRows.length ? Math.min(...rawRows.map((r) => r.seo_difficulty)) : 50;
    const topKeyword = [...g.keywords].sort(
      (a, b) => (rawByKeyword.get(b.toLowerCase())?.volume ?? 0) - (rawByKeyword.get(a.toLowerCase())?.volume ?? 0)
    )[0];
    const combinedText = g.keywords.join(' ');
    items.push({
      slug_suggestion: slugify(groupKey),
      target_keyword: topKeyword,
      cluster_keywords: g.keywords,
      est_volume: g.volume,
      max_cpc: Math.round(maxCpc * 100) / 100,
      min_seo_difficulty: minSeoDifficulty,
      type: guessType(combinedText),
      status: 'pending'
    });
  }

  return items.sort((a, b) => b.est_volume / Math.max(b.min_seo_difficulty, 10) - a.est_volume / Math.max(a.min_seo_difficulty, 10));
}

// ---------------------------------------------------------------------------
// Curation guard - a hand-curated keyword-map.json/queue.json (see task-20's
// Step 3: mapping "e challan ts" to Telangana, merging the discount-scheme
// cluster, consolidating the Jammu & Kashmir fragments, ...) must not be
// silently clobbered by someone re-running this CLI without knowing the
// output was reviewed by a human. Both files carry a top-level `_curated`
// marker for exactly this reason.
// ---------------------------------------------------------------------------

export const UNCURATED_NOTE = 'auto-generated by scripts/keyword-map.ts - not yet hand-curated; review before treating as final';
// Exported so a hand-curation pass (editing the JSON directly, or a future
// curation script) sets exactly this string rather than a slightly different
// one drifting out of sync with what isCurated()/main() document.
export const CURATED_NOTE = 'hand-curated after generation — do NOT regenerate blindly; re-run with --force to overwrite';

export function isCurated(data: unknown): boolean {
  return !!data && typeof data === 'object' && (data as Record<string, unknown>)._curated === true;
}

function readJsonIfExists(path: string): unknown {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return undefined;
  }
}

function main() {
  const args = process.argv.slice(2);
  const forceFlag = args.includes('--force');
  const exportPath = args.find((a) => !a.startsWith('--')) ?? join(process.cwd(), 'data', 'keywords', 'source', 'ubersuggest-traffic-challan-2026-08.csv');

  const outDir = join(process.cwd(), 'data', 'keywords');
  const kmPath = join(outDir, 'keyword-map.json');
  const qPath = join(outDir, 'queue.json');

  const curatedFiles = [kmPath, qPath].filter((p) => isCurated(readJsonIfExists(p)));
  if (curatedFiles.length && !forceFlag) {
    console.error('REFUSING to overwrite hand-curated file(s):');
    for (const p of curatedFiles) console.error(`  ${p}`);
    console.error(
      'These are marked "_curated": true, meaning a person reviewed and hand-fixed the auto-generated\n' +
        'output (e.g. mapping "e challan ts" to the Telangana page, merging the discount-scheme cluster,\n' +
        'consolidating the Jammu & Kashmir fragments). A blind re-run would silently destroy that work.\n' +
        'Re-run with --force to overwrite anyway (this resets _curated to false on both files).'
    );
    process.exit(1);
  }

  const rawRows = readExportCsv(exportPath);
  const rawByKeyword = new Map(rawRows.map((r) => [r.keyword.toLowerCase(), r]));

  const known = buildKnownPages();
  const result = mapKeywords(
    rawRows.map((r) => ({ keyword: r.keyword, volume: r.volume })),
    known
  );
  const queue = buildQueue(result.unassigned, rawByKeyword);

  writeFileSync(kmPath, JSON.stringify({ _curated: false, _curation_note: UNCURATED_NOTE, ...result }, null, 2) + '\n');
  writeFileSync(qPath, JSON.stringify({ _curated: false, _curation_note: UNCURATED_NOTE, items: queue }, null, 2) + '\n');

  const assignedCount = Object.values(result.assigned).reduce((n, arr) => n + arr.length, 0);
  const total = rawRows.length;
  const pct = total ? ((assignedCount / total) * 100).toFixed(1) : '0.0';
  console.log(`keyword-map: ${total} keywords read from ${exportPath}`);
  console.log(`  assigned:   ${assignedCount} (${pct}%) across ${Object.keys(result.assigned).length} known page(s)`);
  console.log(`  unassigned: ${result.unassigned.length} -> ${queue.length} cluster(s) written to queue.json`);
  console.log('  top 20 unassigned clusters by volume:');
  const byVolume = [...queue].sort((a, b) => b.est_volume - a.est_volume).slice(0, 20);
  for (const item of byVolume) {
    console.log(
      `    [${item.type}] "${item.target_keyword}" vol=${item.est_volume} cpc<=${item.max_cpc} seo>=${item.min_seo_difficulty} (${item.cluster_keywords.length} kw) -> ${item.slug_suggestion}`
    );
  }
  if (forceFlag) console.log('(--force used: both output files reset to _curated: false)');
}

if (process.argv[1]?.endsWith('keyword-map.ts')) {
  main();
}
