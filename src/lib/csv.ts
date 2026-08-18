/**
 * Minimal RFC-4180-ish CSV field/row escaping for the /api/fines.csv
 * dataset endpoint. A field is quoted only when it actually needs it
 * (contains a comma, quote or newline); quotes inside a quoted field are
 * doubled per the standard.
 */
export function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function toCsvRow(fields: string[]): string {
  return fields.map(csvField).join(',');
}

/**
 * Column order of /api/fines.csv — the flattened distribution of the fine
 * schedule (the full offence record lives in /api/fines.json). Declared here
 * rather than inside the route so src/lib/open-data.ts documents the exact
 * columns the endpoint emits: the published column list and the served file
 * read from one array.
 */
export const FINES_CSV_HEADER = [
  'slug', 'name', 'mva_section', 'base_fine_text', 'repeat_fine_text', 'compoundable_online'
] as const;
