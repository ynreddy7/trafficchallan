/**
 * Field documentation derived from the zod schemas themselves, so the schema
 * tables published on /data/ cannot drift from the records the API actually
 * serves.
 *
 * The contract is deliberately strict in BOTH directions: a field added to a
 * schema with no plain-English meaning fails the build, and a meaning left
 * behind for a field that no longer exists fails the build too. Silence is
 * never an option — an undocumented field would otherwise vanish from the
 * published schema table while still appearing in the JSON.
 */

import type { ZodTypeAny } from 'zod';
import { isoDate } from './schemas';

/* zod's introspection surface is untyped by design; one cast, contained here. */
const def = (t: ZodTypeAny): any => (t as any)._def;

/** Peels ZodEffects wrappers (`.superRefine(...)`) down to the ZodObject. */
export function unwrapObject(schema: ZodTypeAny): { shape: Record<string, ZodTypeAny> } {
  let s: any = schema;
  while (def(s)?.typeName === 'ZodEffects') s = def(s).schema;
  if (def(s)?.typeName !== 'ZodObject') {
    throw new Error(`schema-doc: expected a ZodObject, got ${def(s)?.typeName ?? 'unknown'}`);
  }
  return s;
}

/**
 * True when the KEY may be absent from the served JSON.
 *
 * ZodDefault deliberately does NOT count. The API serves records that have
 * already been through `schema.parse()` (src/lib/data.ts#loadDir), and zod
 * materialises a default during parsing — so a defaulted field is always a key
 * in the payload, carrying its default value where the source file omitted it.
 * Calling that "optional" on /data/ would contradict the very payload the page
 * documents. Only ZodOptional / ZodNullable can leave the key out.
 */
export function isOptionalField(t: ZodTypeAny): boolean {
  const name = def(t)?.typeName;
  return name === 'ZodOptional' || name === 'ZodNullable';
}

/**
 * The default a ZodDefault field falls back to, rendered as JSON for the
 * published table ("{}", "[]"), or undefined for every other field. The value
 * comes from the schema itself, so the documented default cannot drift from
 * the one zod actually writes into the record.
 */
export function defaultLabel(t: ZodTypeAny): string | undefined {
  if (def(t)?.typeName !== 'ZodDefault') return undefined;
  return JSON.stringify(def(t).defaultValue());
}

const stringLabel = (t: ZodTypeAny): string => {
  // `isoDate` is a single shared instance in schemas.ts, so identity is the
  // most reliable way to spot a date field — more robust than sniffing the
  // regex source.
  if (t === (isoDate as unknown as ZodTypeAny)) return 'date (YYYY-MM-DD)';
  const checks: { kind: string }[] = def(t).checks ?? [];
  if (checks.some((c) => c.kind === 'url')) return 'string (URL)';
  if (checks.some((c) => c.kind === 'regex')) return 'string (fixed pattern)';
  return 'string';
};

/** Human-readable type label for one schema field. */
export function typeLabel(t: ZodTypeAny): string {
  const d = def(t);
  switch (d?.typeName) {
    case 'ZodOptional':
    case 'ZodNullable':
    case 'ZodDefault':
      return typeLabel(d.innerType);
    case 'ZodEffects':
      return typeLabel(d.schema);
    case 'ZodString':
      return stringLabel(t);
    case 'ZodNumber':
      return (d.checks ?? []).some((c: { kind: string }) => c.kind === 'int') ? 'integer' : 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodEnum':
      return `one of: ${(d.values as string[]).join(', ')}`;
    case 'ZodArray':
      return `array of ${typeLabel(d.type)}`;
    case 'ZodRecord':
      return `object keyed by ${typeLabel(d.keyType)} → ${typeLabel(d.valueType)}`;
    case 'ZodObject':
      return `object {${Object.keys((t as any).shape).join(', ')}}`;
    default:
      return String(d?.typeName ?? 'unknown').replace(/^Zod/, '').toLowerCase();
  }
}

export interface FieldRow {
  name: string;
  type: string;
  /** True when the key is always present in the served JSON — defaults included. */
  required: boolean;
  /** For a defaulted field: the value the key carries when the source file
   *  omits it, as JSON. Absent on every other field. */
  defaultsTo?: string;
  meaning: string;
}

/**
 * One documented row per field of `schema`, in schema declaration order.
 *
 * `meanings` must cover the schema's fields exactly — an extra or a missing
 * key throws, naming the field, so the failure lands at build time with an
 * instruction rather than as a quietly incomplete published table.
 * `label` names the schema in that error message.
 */
export function fieldRows(
  schema: ZodTypeAny,
  meanings: Record<string, string>,
  label: string
): FieldRow[] {
  const shape = unwrapObject(schema).shape;
  const names = Object.keys(shape);
  const undocumented = names.filter((n) => !meanings[n]);
  const stale = Object.keys(meanings).filter((n) => !names.includes(n));

  if (undocumented.length || stale.length) {
    const parts = [
      undocumented.length ? `undocumented field(s): ${undocumented.join(', ')}` : '',
      stale.length ? `meaning(s) for field(s) no longer in the schema: ${stale.join(', ')}` : ''
    ].filter(Boolean);
    throw new Error(
      `schema-doc: ${label} — ${parts.join('; ')}. ` +
        'Every field published by the API needs a plain-English meaning in src/lib/open-data.ts.'
    );
  }

  return names.map((name) => {
    const defaultsTo = defaultLabel(shape[name]);
    return {
      name,
      type: typeLabel(shape[name]),
      required: !isOptionalField(shape[name]),
      ...(defaultsTo !== undefined ? { defaultsTo } : {}),
      meaning: meanings[name]
    };
  });
}
