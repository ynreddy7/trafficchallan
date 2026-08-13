import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  StateSchema, OffenceSchema, SchemeSchema, LokAdalatSchema, RtoStateSchema, StatusFileSchema,
  type StateRecord, type OffenceRecord, type SchemeRecord, type LokAdalatRecord, type RtoStateRecord,
  type StatusFileRecord
} from './schemas';
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
export function loadSchemes(dir = join(process.cwd(), 'data', 'schemes')): SchemeRecord[] {
  return loadDir(dir, SchemeSchema);
}
/** RTO directory files. The dir may not exist yet (rto-codes ships later) — tolerate that. */
export function loadRtoFiles(dir = join(process.cwd(), 'data', 'rto')): RtoStateRecord[] {
  if (!existsSync(dir)) return [];
  return loadDir(dir, RtoStateSchema);
}

export function loadJsonFile<S extends ZodType>(path: string, schema: S): z.output<S> {
  try {
    return schema.parse(JSON.parse(readFileSync(path, 'utf-8')));
  } catch (e) {
    throw new Error(`Invalid data file ${basename(path)}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
export function loadLokAdalat(path = join(process.cwd(), 'data', 'lok-adalat.json')): LokAdalatRecord {
  return loadJsonFile(path, LokAdalatSchema);
}
/** The /challan-status/ decoder's status vocabulary + vcourts coverage. */
export function loadStatusFile(path = join(process.cwd(), 'data', 'challan-statuses.json')): StatusFileRecord {
  return loadJsonFile(path, StatusFileSchema);
}

/**
 * Newest last_verified across schemes + lok-adalat — the dateModified /
 * LastVerified date for the /challan-discount/ hub. Kept separate from
 * newestVerifiedDate() so the hub reflects only its own datasets, but the
 * dates also feed into the global max below.
 */
export function maxSchemeDate(): string {
  const dates = [
    ...loadSchemes().map((s) => s.last_verified),
    loadLokAdalat().last_verified
  ];
  return dates.sort().at(-1)!;
}

/**
 * Newest last_verified date across every state, every offence, every
 * guide's frontmatter, every scheme, lok-adalat, and the challan-status
 * file — the single source of truth for the "global max" dateModified used
 * by the site-wide summary pages (/, /fines/, /calculator/, /compare/).
 *
 * RTO files are deliberately EXCLUDED: they are slow-moving directory data
 * (365-day staleness) and should not bump site-wide freshness dates.
 *
 * This MUST stay in agreement with astro.config.mjs's buildLastmodMap(),
 * which independently computes the same max (states + fines + guides +
 * schemes + lok-adalat + challan-statuses) at config-load time to assign
 * <lastmod> for those same four URLs in the sitemap. If the source
 * directories or aggregation logic change here, change them there too —
 * otherwise a page's JSON-LD dateModified will disagree with its own
 * sitemap entry.
 */
export function newestVerifiedDate(): string {
  const dates: string[] = [
    ...loadStates().map((s) => s.last_verified),
    ...loadOffences().map((o) => o.last_verified),
    ...loadSchemes().map((s) => s.last_verified),
    loadLokAdalat().last_verified,
    loadStatusFile().last_verified
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
