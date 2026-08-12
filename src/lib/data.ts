import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { StateSchema, OffenceSchema, type StateRecord, type OffenceRecord } from './schemas';
import type { ZodType } from 'zod';
import { z } from 'zod';

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
