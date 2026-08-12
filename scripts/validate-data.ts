import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { readFileSync } from 'node:fs';
import { loadStates, loadOffences } from '../src/lib/data';
import { runGates, type GuideMeta } from '../src/lib/gate';

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
  const violations = runGates({
    states: loadStates(),
    offences: loadOffences(),
    guides: loadGuideMeta(),
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
