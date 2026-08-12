import { describe, it, expect } from 'vitest';
import { shortSection, firstSentence, firstClause, slugify } from '../src/lib/format';
import { loadStates } from '../src/lib/data';

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

describe('firstSentence', () => {
  it('cuts at the first period followed by whitespace', () => {
    const input = 'Delhi runs two tracks and they behave very differently. Compoundable offences carry a fixed amount.';
    expect(firstSentence(input)).toBe('Delhi runs two tracks and they behave very differently.');
  });

  it('does not break on a period inside a URL with no trailing space', () => {
    const input = 'West Bengal has a live Virtual Court for traffic challans: vcourts.gov.in lists "West Bengal(Traffic Department)" (court code WBVC01) among its departments. When an officer marks a challan for court, it is forwarded there.';
    expect(firstSentence(input)).toBe(
      'West Bengal has a live Virtual Court for traffic challans: vcourts.gov.in lists "West Bengal(Traffic Department)" (court code WBVC01) among its departments.'
    );
  });

  it('returns the whole text when there is no sentence-ending period', () => {
    const input = 'No period here at all';
    expect(firstSentence(input)).toBe('No period here at all');
  });

  it('returns the whole text when it is a single sentence ending the string', () => {
    const input = 'Andhra Pradesh has no Virtual Court for traffic challans.';
    expect(firstSentence(input)).toBe('Andhra Pradesh has no Virtual Court for traffic challans.');
  });
});

describe('firstClause', () => {
  it('splits at the first " (" ', () => {
    const input = '₹785 for a light motor vehicle and ₹2,035 for a heavy vehicle (s.183). The LMV rate sits below the central minimum.';
    expect(firstClause(input)).toBe('₹785 for a light motor vehicle and ₹2,035 for a heavy vehicle');
  });

  it('splits at the first em dash', () => {
    const input = "Court challan — Delhi notifies no compounding amount for 'Jumping Red Light'";
    expect(firstClause(input)).toBe('Court challan');
  });

  it('splits at the first semicolon', () => {
    const input = '₹500 (Bengaluru Traffic Police schedule; statewide gazette compounds s.184 only for handheld use)';
    expect(firstClause(input)).toBe('₹500');
  });

  it('picks whichever delimiter occurs earliest', () => {
    const input = 'Amount; details (extra) more';
    expect(firstClause(input)).toBe('Amount');
  });

  it('returns the trimmed whole text when no delimiter is present', () => {
    const input = 'LMV ₹1,000 first offence, ₹2,000 second.';
    expect(firstClause(input)).toBe('LMV ₹1,000 first offence, ₹2,000 second.');
  });

  it('splits at the first period-space, dropping the terminal punctuation', () => {
    const input =
      'First offence: imprisonment up to 3 months, or a fine of ₹2,000, or both. Repeat offence carries the same imprisonment term.';
    expect(firstClause(input)).toBe('First offence: imprisonment up to 3 months, or a fine of ₹2,000, or both');
  });

  it('splits at the first en dash', () => {
    const input = 'Standard amount – varies by vehicle class and is compounded locally';
    expect(firstClause(input)).toBe('Standard amount');
  });

  it('hard-caps a clause with no early delimiter at 90 chars, cutting at a word boundary with an ellipsis', () => {
    const input = 'A'.repeat(30) + ' ' + 'B'.repeat(30) + ' ' + 'C'.repeat(30) + ' ' + 'D'.repeat(30);
    const result = firstClause(input);
    expect(result.length).toBeLessThanOrEqual(90);
    expect(result.endsWith('…')).toBe(true);
    expect(result).toBe('A'.repeat(30) + ' ' + 'B'.repeat(30) + '…');
  });

  it('hard-caps a real 187-char override with no early delimiter (AP dangerous-driving-red-light)', () => {
    const input =
      "₹1,035 light motor vehicle, ₹2,035 heavy vehicle for dangerous driving under s.184. AP's chart illustrates s.184 only with handheld-device use and does not list signal jumping separately.";
    const result = firstClause(input);
    expect(result.length).toBeLessThanOrEqual(90);
    expect(result).toBe('₹1,035 light motor vehicle, ₹2,035 heavy vehicle for dangerous driving under s.184');
  });

  it('keeps every real fine_overrides amount_text at or under 90 chars and non-empty, across all states', () => {
    const states = loadStates();
    let checked = 0;
    for (const state of states) {
      for (const [offenceSlug, override] of Object.entries(state.fine_overrides)) {
        const result = firstClause(override.amount_text);
        checked++;
        expect(result.length, `${state.slug}/${offenceSlug}: "${result}"`).toBeGreaterThan(0);
        expect(result.length, `${state.slug}/${offenceSlug}: "${result}"`).toBeLessThanOrEqual(90);
      }
    }
    // Sanity check that the loop actually iterated a non-trivial real population,
    // not an empty or accidentally-filtered set.
    expect(checked).toBeGreaterThanOrEqual(50);
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates a plain heading', () => {
    expect(slugify('How to check your Delhi challan')).toBe('how-to-check-your-delhi-challan');
  });

  it('collapses punctuation and multiple spaces into a single hyphen', () => {
    expect(slugify('Court challans in Jammu & Kashmir')).toBe('court-challans-in-jammu-kashmir');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  -- What is Section 194D? --  ')).toBe('what-is-section-194d');
  });

  it('handles a short example matching the spec illustration', () => {
    expect(slugify('How to check')).toBe('how-to-check');
  });
});
