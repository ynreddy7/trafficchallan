import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { readFileSync } from 'node:fs';
import { loadStates, loadOffences, loadSchemes, loadLokAdalat, loadRtoFiles, loadStatusFile, loadOfficialPortals } from '../src/lib/data';
import { runGates, type GuideMeta, type PageMeta } from '../src/lib/gate';

// Feature pages (src/pages/*.astro) that own a target keyword — they join
// the gate's duplicate-keyword and duplicate-slug registries.
const FEATURE_PAGES: PageMeta[] = [
  { slug: 'challan-discount', target_keyword: 'traffic challan discount' },
  { slug: 'rto-codes', target_keyword: 'rto code list india' },
  { slug: 'challan-status', target_keyword: 'e challan status meaning' },
  { slug: 'fake-challan-sms', target_keyword: 'e challan fake sms' },
  { slug: 'echallan-parivahan', target_keyword: 'echallan parivahan' },
  { slug: 'data', target_keyword: 'traffic challan open data' }
];

function loadGuideMeta(): GuideMeta[] {
  const dir = join(process.cwd(), 'src', 'content', 'guides');
  if (!existsSync(dir)) return [];
  return fg.sync('*.md', { cwd: dir }).map((file) => {
    const fm = matter(readFileSync(join(dir, file), 'utf-8')).data;
    return {
      file,
      target_keyword: String(fm.target_keyword ?? ''),
      last_verified: String(fm.last_verified ?? '1970-01-01'),
      sources: Array.isArray(fm.sources) ? fm.sources.map(String) : []
    };
  });
}

try {
  const rtoFiles = loadRtoFiles();
  // /rto-codes/{state}/ hub pages: one per data/rto/ file, generated from the
  // same loader src/pages/rto-codes/[state].astro routes from, so the registry
  // can never drift from the built pages. Slugs are path-scoped
  // ("rto-codes/maharashtra") because the bare state name already lives in
  // other namespaces ("maharashtra-e-challan", "fines/maharashtra").
  const rtoHubPages: PageMeta[] = rtoFiles.map((r) => ({
    slug: `rto-codes/${r.slug}`,
    target_keyword: `${r.state_name.toLowerCase()} rto code list`
  }));
  const violations = runGates({
    states: loadStates(),
    offences: loadOffences(),
    guides: loadGuideMeta(),
    schemes: loadSchemes(),
    lokAdalat: loadLokAdalat(),
    rtoFiles,
    statusFile: loadStatusFile(),
    portalsFile: loadOfficialPortals(),
    pages: [...FEATURE_PAGES, ...rtoHubPages],
    now: new Date()
  });
  if (violations.length) {
    console.error(`GATE FAILED — ${violations.length} violation(s):\n` + violations.map((x) => `  • ${x}`).join('\n'));
    process.exit(1);
  }
  console.log('gate: all quality gates passed');
} catch (e) {
  console.error('GATE FAILED — data load error:\n' + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
