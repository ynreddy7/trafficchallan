import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { StateSchema, OffenceSchema, type StateRecord, type OffenceRecord } from './schemas';
import type { ZodType } from 'zod';
import { z } from 'zod';
import matter from 'gray-matter';

function loadDir<S extends ZodType<{ slug: string }>>(dir: string, schema: S): z.output<S>[] {
  const errors: string[] = [];
  const records: z.output<S>[] = [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
      const rec = schema.parse(raw);
      if (basename(file, '.json') !== rec.slug) {
        errors.push(`${file}: slug "${rec.slug}" does not match filename`);
        continue;
      }
      records.push(rec);
    } catch (e) {
      errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (errors.length) throw new Error(`Invalid data files:\n${errors.join('\n---\n')}`);
  return records;
}

export function loadStates(dir = join(process.cwd(), 'data', 'states')): StateRecord[] {
  return loadDir(dir, StateSchema);
}
export function loadOffences(dir = join(process.cwd(), 'data', 'fines')): OffenceRecord[] {
  return loadDir(dir, OffenceSchema);
}

/**
 * Newest last_verified date across every state, every offence, and every
 * guide's frontmatter — the single source of truth for the "global max"
 * dateModified used by the site-wide summary pages (/, /fines/,
 * /calculator/, /compare/).
 *
 * This MUST stay in agreement with astro.config.mjs's buildLastmodMap(),
 * which independently computes the same max (states + fines + guides) at
 * config-load time to assign <lastmod> for those same four URLs in the
 * sitemap. If the source directories or aggregation logic change here,
 * change them there too — otherwise a page's JSON-LD dateModified will
 * disagree with its own sitemap entry.
 */
export function newestVerifiedDate(): string {
  const dates: string[] = [
    ...loadStates().map((s) => s.last_verified),
    ...loadOffences().map((o) => o.last_verified)
  ];

  const guidesDir = join(process.cwd(), 'src', 'content', 'guides');
  let guideFiles: string[] = [];
  try {
    guideFiles = readdirSync(guidesDir).filter((f) => f.endsWith('.md'));
  } catch {
    guideFiles = [];
  }
  for (const file of guideFiles) {
    const { data } = matter(readFileSync(join(guidesDir, file), 'utf-8'));
    if (data.last_verified) dates.push(data.last_verified);
  }

  if (!dates.length) throw new Error('newestVerifiedDate: no dated records found');
  return dates.sort().at(-1)!;
}
