import type { StateRecord, OffenceRecord } from './schemas';

export interface FineResult { text: string; overridden: boolean; overrideSource?: string; sectionNote: string }

export function computeFine(offence: OffenceRecord, state: StateRecord | null, repeat: boolean): FineResult {
  const sectionNote = `${offence.mva_section}. ${offence.licence_impact}`;
  const override = state?.fine_overrides[offence.slug];
  if (override) {
    return { text: override.amount_text, overridden: true, overrideSource: override.source, sectionNote };
  }
  return { text: repeat ? offence.repeat_fine_text : offence.base_fine_text, overridden: false, sectionNote };
}
