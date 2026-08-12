import { describe, it, expect } from 'vitest';
import { shortSection } from '../src/lib/format';

describe('shortSection', () => {
  it('removes statute name and amendment history', () => {
    const input = 'Section 194D, Motor Vehicles Act 1988 (as amended by the Motor Vehicles (Amendment) Act 2019, w.e.f. 1-9-2019)';
    const result = shortSection(input);
    expect(result).toBe('Section 194D');
  });

  it('handles section with multiple references', () => {
    const input = 'Section 194D read with Section 129, Motor Vehicles Act 1988 (as amended by the Motor Vehicles (Amendment) Act 2019, w.e.f. 1-9-2019)';
    const result = shortSection(input);
    expect(result).toBe('Section 194D read with Section 129');
  });

  it('handles section with Explanation clause', () => {
    const input = 'Section 184, Explanation clause (c), Motor Vehicles Act 1988 (inserted by the Motor Vehicles (Amendment) Act 2019, w.e.f. 1-9-2019)';
    const result = shortSection(input);
    expect(result).toBe('Section 184, Explanation clause (c)');
  });

  it('handles text without comma', () => {
    const input = 'Section 192 read with Section 39, Motor Vehicles Act 1988';
    const result = shortSection(input);
    expect(result).toBe('Section 192 read with Section 39');
  });

  it('returns as-is if no comma present (edge case)', () => {
    const input = 'Some section text without comma';
    const result = shortSection(input);
    expect(result).toBe('Some section text without comma');
  });
});
