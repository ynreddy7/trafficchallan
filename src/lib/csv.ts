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
