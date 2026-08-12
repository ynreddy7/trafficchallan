import { describe, it, expect } from 'vitest';
import { csvField, toCsvRow } from '../src/lib/csv';

describe('csvField', () => {
  it('leaves a plain field unquoted', () => {
    expect(csvField('overspeeding')).toBe('overspeeding');
  });

  it('quotes a field containing a comma', () => {
    expect(csvField('₹1,000')).toBe('"₹1,000"');
  });

  it('quotes and doubles internal quotes', () => {
    expect(csvField('Court challan — no "compounding"')).toBe('"Court challan — no ""compounding"""');
  });

  it('quotes a field containing a newline', () => {
    expect(csvField('line one\nline two')).toBe('"line one\nline two"');
  });
});

describe('toCsvRow', () => {
  it('joins fields with commas, quoting only where needed', () => {
    expect(toCsvRow(['overspeeding', 'Overspeeding', '₹1,000-2,000', 'true'])).toBe(
      'overspeeding,Overspeeding,"₹1,000-2,000",true'
    );
  });
});
